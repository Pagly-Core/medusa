import {
  DistributedTransaction,
  TransactionHandlerType,
  TransactionOrchestrator,
  TransactionStepsDefinition,
} from "../../transaction"
import { BaseInMemoryDistributedTransactionStorage } from "../../transaction/datastore/base-in-memory-storage"

/**
 * A flow that is never stored (no async step, timeout, retention or
 * idempotency) has no checkpoint to load, so beginning one does not look it up
 * in the storage: on the Redis engine that lookup is a database read and a
 * Redis read for every workflow and nested workflow run.
 */
describe("Beginning a transaction", () => {
  const storage = new BaseInMemoryDistributedTransactionStorage()
  const get = jest.spyOn(storage, "get")

  beforeAll(() => {
    DistributedTransaction.setStorage(storage)
  })

  afterEach(() => {
    get.mockClear()
  })

  const handler = async (
    _actionId: string,
    _type: TransactionHandlerType
  ) => undefined

  const flow: TransactionStepsDefinition = {
    next: { action: "only" },
  }

  it("does not look up a flow that is never stored", async () => {
    const orchestrator = new TransactionOrchestrator({
      id: "never-stored",
      definition: flow,
    })

    const transaction = await orchestrator.beginTransaction({
      transactionId: "trx_never_stored",
      handler,
    })
    await orchestrator.resume(transaction)

    expect(get).not.toHaveBeenCalled()
    expect(transaction.getState()).toBe("done")
  })

  it("still looks up a stored flow, which may have run before", async () => {
    const orchestrator = new TransactionOrchestrator({
      id: "stored-idempotent",
      definition: flow,
      options: { idempotent: true },
    })

    await orchestrator.beginTransaction({
      transactionId: "trx_stored",
      handler,
    })

    expect(get).toHaveBeenCalledTimes(1)
  })

  it("still looks up a flow whose shared options say it is stored", async () => {
    const plain = new TransactionOrchestrator({
      id: "stored-elsewhere",
      definition: flow,
    })
    // Built last, so the shared options for this id say it is stored, and
    // its runs' checkpoints are saved through them.
    new TransactionOrchestrator({
      id: "stored-elsewhere",
      definition: flow,
      options: { retentionTime: 60 },
    })

    await plain.beginTransaction({
      transactionId: "trx_stored_elsewhere",
      handler,
    })

    expect(get).toHaveBeenCalledTimes(1)
  })

  it("still looks up a flow with an async step", async () => {
    const orchestrator = new TransactionOrchestrator({
      id: "stored-async",
      definition: { next: { action: "only", async: true } },
    })

    await orchestrator.beginTransaction({
      transactionId: "trx_async",
      handler,
    })

    expect(get).toHaveBeenCalledTimes(1)
  })
})
