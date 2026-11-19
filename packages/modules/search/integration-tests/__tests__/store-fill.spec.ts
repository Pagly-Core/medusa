import { SearchTypes } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { SearchIndex, SearchIndexSync, SearchIndexVersion } from "@models"
import {
  baseProducts,
  productIndex,
  resetDataset,
} from "../__fixtures__/product-index"

jest.setTimeout(120000)

// Pagly: a host that owns its stores' data fills a new index version itself,
// one slice at a time, then makes it active. These cover the three seams it
// needs: no startup seed, writes aimed at a named version, and activation.

type SearchService = SearchTypes.ISearchModuleService

const boot = (service: SearchService) =>
  (service as any).onApplicationStart_() as Promise<void>

const migrate = async (service: SearchService) =>
  service.executeIndexMigrationPlan(await service.createIndexMigrationPlan())

const indexRecord = async (service: SearchService) => {
  const [record] = await (service as any).context_.indexService.list({
    name: "product",
  })
  return record
}

const versionRecords = (service: SearchService) =>
  (service as any).context_.versionService.list({}) as Promise<any[]>

const syncRecords = (service: SearchService) =>
  (service as any).context_.syncService.list({}) as Promise<any[]>

// Simulates a definition change, as the main suite does: the active version's
// hash no longer matches, so the next migration builds a new version.
const drift = async (service: SearchService) => {
  const record = await indexRecord(service)
  const [active] = await (service as any).context_.versionService.list({
    search_index_id: record.id,
    version: record.active_version,
  })
  await (service as any).context_.versionService.update({
    selector: { id: active.id },
    data: { definition_hash: "stale" },
  })
}

const ids = (result: SearchTypes.SearchResult) =>
  result.hits.map((hit) => hit.id).sort()

const searchAll = (service: SearchService) =>
  service.search({ entity: "product", fields: ["id"] })

const [shoe, shirt, hat] = baseProducts

moduleIntegrationTestRunner<SearchService>({
  moduleName: Modules.SEARCH,
  moduleModels: [SearchIndex, SearchIndexVersion, SearchIndexSync],
  resolve: __dirname + "/../..",
  pathToMigrations: [
    __dirname + "/../../src/migrations",
    __dirname + "/../../../providers/search-postgres/src/migrations",
  ],
  moduleOptions: {
    providers: [{ resolve: "@medusajs/search-postgres", id: "postgres" }],
    indexes: [productIndex],
    seed_on_start: false,
  },
  hooks: {
    beforeModuleInit: async () => {
      resetDataset()
    },
    afterModuleInit: async (_app: any, service: SearchService) => {
      await migrate(service)
      await boot(service)
    },
  },
  testSuite: ({ service }) =>
    describe("Search Module, filled by its host", () => {
      describe("seed_on_start: false", () => {
        it("leaves the first version pending and empty after a boot", async () => {
          const record = await indexRecord(service)
          const versions = await versionRecords(service)

          expect(record.active_version).toBeNull()
          expect(versions).toHaveLength(1)
          expect(versions[0]).toMatchObject({ version: 1, status: "pending" })
          expect(await syncRecords(service)).toHaveLength(0)
        })
      })

      describe("retrievePendingVersion", () => {
        it("names the version a migration built and nobody activated", async () => {
          await expect(
            service.retrievePendingVersion("product")
          ).resolves.toEqual({
            version: 1,
            physical_name: "product_v1",
            provider: "search-postgres",
            status: "pending",
          })
        })

        it("answers null once that version is active", async () => {
          await expect(
            service.retrievePendingVersion("product")
          ).resolves.toMatchObject({ version: 1 })

          await service.activateVersion("product", 1)

          await expect(
            service.retrievePendingVersion("product")
          ).resolves.toBeNull()
        })
      })

      describe("writes to a named version", () => {
        it("fills the pending version without touching the registry", async () => {
          await service.upsertDocuments({
            index: "product",
            version: 1,
            documents: [shoe, shirt],
          })

          const record = await indexRecord(service)
          const [version] = await versionRecords(service)

          expect(record.active_version).toBeNull()
          expect(version.status).toBe("pending")
          expect(await syncRecords(service)).toHaveLength(0)
        })

        it("deletes from the pending version", async () => {
          expect((await indexRecord(service)).active_version).toBeNull()

          await service.upsertDocuments({
            index: "product",
            version: 1,
            documents: [shoe, shirt, hat],
          })
          await service.deleteDocuments({
            index: "product",
            version: 1,
            filters: { id: [hat.id] },
          })
          await service.activateVersion("product", 1)

          expect(ids(await searchAll(service))).toEqual([shoe.id, shirt.id])
        })

        it("refuses a version the index does not have", async () => {
          await expect(
            service.upsertDocuments({
              index: "product",
              version: 7,
              documents: [shoe],
            })
          ).rejects.toThrow(/version 7/)
        })

        it("refuses a version older than the active one", async () => {
          await service.activateVersion("product", 1)
          await drift(service)
          await migrate(service)
          await service.activateVersion("product", 2)

          await expect(
            service.upsertDocuments({
              index: "product",
              version: 1,
              documents: [shoe],
            })
          ).rejects.toThrow(/version 1/)
        })
      })

      describe("activateVersion", () => {
        it("makes the filled version serve reads", async () => {
          await service.upsertDocuments({
            index: "product",
            version: 1,
            documents: [shoe, shirt],
          })

          await service.activateVersion("product", 1)

          const record = await indexRecord(service)
          const [version] = await versionRecords(service)

          expect(record.active_version).toBe(1)
          expect(version.status).toBe("ready")
          expect(ids(await searchAll(service))).toEqual([shoe.id, shirt.id])
        })

        it("keeps reads on the old version while the new one fills, then swaps", async () => {
          await service.upsertDocuments({
            index: "product",
            version: 1,
            documents: [shoe],
          })
          await service.activateVersion("product", 1)

          await drift(service)
          await migrate(service)

          await service.upsertDocuments({
            index: "product",
            version: 2,
            documents: [shoe, shirt],
          })

          // Still the old version: the new one isn't active yet.
          expect(ids(await searchAll(service))).toEqual([shoe.id])

          await service.activateVersion("product", 2)

          expect(ids(await searchAll(service))).toEqual([shoe.id, shirt.id])
          expect((await indexRecord(service)).active_version).toBe(2)
          // As after a swap, the previous version stays for a rollback; the
          // next migration cleans it up.
          expect(
            (await versionRecords(service))
              .map((v: any) => v.version)
              .sort()
          ).toEqual([1, 2])
        })

        it("refuses a version that is not pending", async () => {
          await service.activateVersion("product", 1)

          await expect(service.activateVersion("product", 1)).rejects.toThrow(
            /version 1/
          )
          await expect(service.activateVersion("product", 9)).rejects.toThrow(
            /version 9/
          )
        })
      })

      describe("plain writes without a version", () => {
        it("still go to the active version", async () => {
          await service.activateVersion("product", 1)

          await service.upsertDocuments({
            index: "product",
            documents: [hat],
          })

          expect(ids(await searchAll(service))).toEqual([hat.id])
        })
      })

      // During a rollout, a task still on the previous image may run the
      // host's fill. It must not fill or activate a version built for a
      // definition it doesn't have.
      describe("a pending version built for another definition", () => {
        const builtElsewhere = async () => {
          const [pending] = await versionRecords(service)
          await (service as any).context_.versionService.update({
            selector: { id: pending.id },
            data: { definition_hash: "built-by-a-newer-image" },
          })
        }

        it("is not offered as pending", async () => {
          await builtElsewhere()

          await expect(
            service.retrievePendingVersion("product")
          ).resolves.toBeNull()
        })

        it("refuses writes and activation", async () => {
          await builtElsewhere()

          await expect(
            service.upsertDocuments({
              index: "product",
              version: 1,
              documents: [shoe],
            })
          ).rejects.toThrow(/version 1/)
          await expect(service.activateVersion("product", 1)).rejects.toThrow(
            /version 1/
          )
        })
      })

      // The host catches up on what changed during a fill once it activates,
      // so an event that arrives while nothing is active has nowhere to go.
      // Throwing would retry every store's product events until then.
      describe("live events", () => {
        it("are skipped while no version is active", async () => {
          await expect(
            service.ingest({
              name: "product.updated",
              data: { id: shoe.id },
            } as any)
          ).resolves.toEqual([])

          await service.activateVersion("product", 1)

          expect(ids(await searchAll(service))).toEqual([])
        })

        it("reach the active version once there is one", async () => {
          await service.activateVersion("product", 1)

          await service.ingest({
            name: "product.updated",
            data: { id: shoe.id },
          } as any)

          expect(ids(await searchAll(service))).toEqual([shoe.id])
        })
      })
    }),
})
