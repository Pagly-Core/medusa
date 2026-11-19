// Pagly: versions filled by their host instead of the startup seed
// (`seed_on_start: false`). A host that keeps several stores in one index
// fills a new version itself, one store at a time and on that store's own
// connection, then activates it once every store is in. These helpers do that
// without the registry writes a seed makes (sync rows, BUILDING), which a
// store's connection may not be allowed to make. See PAGLY-CORE-DIVERGENCE.md.

import { SearchTypes } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  SearchIndexContext,
  SearchIndexRecord,
  SearchIndexVersionRecord,
} from "@types"
import {
  listVersionsByIndexId,
  retrieveIndexDefinition,
  SearchIndexState,
} from "./index"
import { cleanupAfterSwap } from "./versions"

type HostFillContext = Pick<
  SearchIndexContext,
  | "indexes"
  | "indexService"
  | "versionService"
  | "providers"
  | "logger"
  | "locking"
  | "activeVersionCache"
>

async function versionsOf(
  context: HostFillContext,
  name: string
): Promise<{
  record: SearchIndexRecord
  versions: SearchIndexVersionRecord[]
}> {
  const [record] = (await context.indexService.list({
    name,
  })) as SearchIndexRecord[]

  if (!record) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Search index "${name}" has no record; run migrations to create it`
    )
  }

  const versions =
    (await listVersionsByIndexId(context, [record.id])).get(record.id) ?? []

  return { record, versions }
}

// Built by a migration and never activated: newer than the active version, or
// any version while none is active yet.
const isPending = (
  record: SearchIndexRecord,
  version: SearchIndexVersionRecord
) => record.active_version == null || version.version > record.active_version

const toInfo = (
  version: SearchIndexVersionRecord
): SearchTypes.SearchIndexVersionInfo => ({
  version: version.version,
  physical_name: version.physical_name,
  provider: version.provider,
  status: version.status as SearchTypes.SearchIndexStatus,
})

export async function retrievePendingVersion(
  context: HostFillContext,
  name: string
): Promise<SearchTypes.SearchIndexVersionInfo | null> {
  retrieveIndexDefinition(context.indexes, name)

  const { record, versions } = await versionsOf(context, name)
  const pending = versions
    .filter((version) => isPending(record, version))
    .sort((a, b) => b.version - a.version)[0]

  return pending ? toInfo(pending) : null
}

/**
 * The definition merged with one named version's physical index and provider,
 * for writes aimed at it. Only the active version and pending ones take
 * writes: an older version is on its way out.
 */
export async function resolveVersionDefinition(
  context: HostFillContext,
  name: string,
  version: number
): Promise<SearchTypes.ResolvedSearchIndexDefinition> {
  const definition = retrieveIndexDefinition(context.indexes, name)
  const { record, versions } = await versionsOf(context, name)
  const target = versions.find((candidate) => candidate.version === version)

  if (
    !target ||
    (record.active_version != null && version < record.active_version)
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Search index "${name}" has no writable version ${version}: writes go to the active version or a pending one`
    )
  }

  return {
    ...definition,
    physical_name: target.physical_name,
    provider: target.provider,
  }
}

/**
 * Makes a pending version serve reads, as the end of a swap seed does: marks
 * it ready, points the index at it, refreshes the cache, and cleans up older
 * versions while keeping the one it replaces. Takes the seed lock, so it never
 * races a seed or a reindex of the same index.
 */
export async function activateVersion(
  context: HostFillContext,
  name: string,
  version: number
): Promise<void> {
  retrieveIndexDefinition(context.indexes, name)

  const run = async () => {
    const { record, versions } = await versionsOf(context, name)
    const target = versions.find((candidate) => candidate.version === version)

    if (!target || !isPending(record, target)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Search index "${name}" has no pending version ${version} to activate`
      )
    }

    context.logger.info(
      `[Search] Making "${name}" version ${version} active (filled by its host)`
    )

    await context.versionService.update({
      selector: { id: target.id },
      data: { status: SearchIndexState.READY },
    })
    await context.indexService.update({
      selector: { name },
      data: { active_version: version },
    })
    await context.activeVersionCache?.set(name, {
      physical_name: target.physical_name,
      provider: target.provider,
      version: target.version,
    })

    await cleanupAfterSwap(context, {
      record_id: record.id,
      active_version: version,
      previous_version: record.active_version ?? null,
    })
  }

  if (context.locking) {
    await context.locking.execute(`search:seed:${name}`, () => run())
    return
  }

  await run()
}
