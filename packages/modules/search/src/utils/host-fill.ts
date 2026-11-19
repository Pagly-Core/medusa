// Pagly: versions filled by their host instead of the startup seed
// (`seed_on_start: false`). A host that keeps several stores in one index
// fills a new version itself, one store at a time and on that store's own
// connection, then activates it once every store is in. These helpers do that
// without the registry writes a seed makes (sync rows, BUILDING), which a
// store's connection may not be allowed to make. See PAGLY-CORE-DIVERGENCE.md.

import { SearchTypes } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  SearchEventRoutes,
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

// Built for the definition this process loaded. During a rollout, a task
// still on the previous image must not fill or activate a version a newer
// image's migration built.
const builtForThisDefinition = (
  definition: SearchTypes.ResolvedSearchIndexDefinition,
  version: SearchIndexVersionRecord
) => version.definition_hash === definition.definition_hash

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
  const definition = retrieveIndexDefinition(context.indexes, name)

  const { record, versions } = await versionsOf(context, name)
  const pending = versions
    .filter((version) => isPending(record, version))
    .sort((a, b) => b.version - a.version)[0]

  return pending && builtForThisDefinition(definition, pending)
    ? toInfo(pending)
    : null
}

export async function retrieveActiveVersion(
  context: HostFillContext,
  name: string
): Promise<SearchTypes.SearchIndexVersionInfo | null> {
  retrieveIndexDefinition(context.indexes, name)

  const { record, versions } = await versionsOf(context, name)
  const active = versions.find(
    (version) => version.version === record.active_version
  )

  return active ? toInfo(active) : null
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
    (record.active_version != null && version < record.active_version) ||
    (isPending(record, target) && !builtForThisDefinition(definition, target))
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
  const definition = retrieveIndexDefinition(context.indexes, name)

  const run = async () => {
    const { record, versions } = await versionsOf(context, name)
    const target = versions.find((candidate) => candidate.version === version)

    if (
      !target ||
      !isPending(record, target) ||
      !builtForThisDefinition(definition, target)
    ) {
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

/**
 * The event's routes, less the indexes with no active version yet. The host
 * catches up on what changed during a fill once it activates, so an event
 * that arrives before then has nowhere to go; throwing would have the event
 * bus retry every store's events until activation. A cached "none" is
 * checked against the database, so an activation by another process is seen
 * at once.
 */
export async function routesWithActiveVersion(
  context: Pick<SearchIndexContext, "activeVersionCache">,
  routes: SearchEventRoutes,
  eventName: string
): Promise<SearchEventRoutes> {
  const names = routes.get(eventName)

  if (!names?.length || !context.activeVersionCache) {
    return routes
  }

  const active: string[] = []

  for (const name of names) {
    if (await hasActiveVersion(context.activeVersionCache, name)) {
      active.push(name)
    }
  }

  return new Map([[eventName, active]])
}

async function hasActiveVersion(
  cache: NonNullable<SearchIndexContext["activeVersionCache"]>,
  name: string
): Promise<boolean> {
  for (const fresh of [false, true]) {
    try {
      await cache.get(name, { fresh })
      return true
    } catch (error) {
      if (
        !(error instanceof MedusaError) ||
        error.type !== MedusaError.Types.NOT_FOUND
      ) {
        throw error
      }
    }
  }

  return false
}
