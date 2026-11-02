import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { IStoreCreditModuleService, PluginModule } from "../../../types"

/**
 * The data to retrieve the balance statistics of store credit accounts.
 */
export interface RetrieveStoreCreditAccountsStatsStepInput {
  /**
   * The IDs of the store credit accounts.
   */
  account_ids: string[]
}

/**
 * Pagly: this step retrieves the balance statistics of store credit accounts
 * with one grouped query. It returns a map of account IDs to their statistics;
 * unknown IDs are left out.
 *
 * @example
 * const statsByAccount = retrieveStoreCreditAccountsStatsStep({
 *   account_ids: ["sc_acc_123"],
 * })
 */
export const retrieveStoreCreditAccountsStatsStep = createStep(
  "retrieve-store-credit-accounts-stats",
  async (
    { account_ids }: RetrieveStoreCreditAccountsStatsStepInput,
    { container }
  ) => {
    const module = container.resolve<IStoreCreditModuleService>(
      PluginModule.STORE_CREDIT
    )

    return new StepResponse(await module.retrieveAccountsStats(account_ids))
  }
)
