import {
  IStockLocationService,
  UpdateStockLocationInput,
} from "@medusajs/framework/types"
import { Modules, promiseAll } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

/**
 * A stock location and the address to point it at.
 */
export interface LinkStockLocationAddressInput {
  /**
   * The ID of the stock location.
   */
  id: string
  /**
   * The ID of the address it now has.
   */
  address_id: string
}

const unlink = async (
  stockLocationService: IStockLocationService,
  locationIds: string[]
) => {
  await promiseAll(
    locationIds.map((id) =>
      stockLocationService.updateStockLocations(id, {
        address: null,
      } as unknown as UpdateStockLocationInput)
    )
  )
}

export const linkStockLocationAddressesStepId =
  "link-stock-location-addresses-step"
/**
 * This step points stock locations that had no address at the address just
 * created for each of them.
 *
 * @example
 * const data = linkStockLocationAddressesStep([
 *   { id: "sloc_123", address_id: "laddr_123" },
 * ])
 */
export const linkStockLocationAddressesStep = createStep(
  linkStockLocationAddressesStepId,
  async (input: LinkStockLocationAddressInput[], { container }) => {
    if (!input.length) {
      return new StepResponse(void 0, [])
    }

    const stockLocationService = container.resolve<IStockLocationService>(
      Modules.STOCK_LOCATION
    )

    try {
      await promiseAll(
        input.map((link) =>
          // The relation takes the address id; an `address_id` key is dropped
          // without an error.
          stockLocationService.updateStockLocations(link.id, {
            address: link.address_id,
          } as unknown as UpdateStockLocationInput)
        )
      )
    } catch (error) {
      // A failed step is not compensated, and the address step's
      // compensation deletes these addresses next: deleting an address
      // still linked deletes its location too, so unlink every one first.
      await unlink(
        stockLocationService,
        input.map((link) => link.id)
      )
      throw error
    }

    return new StepResponse(
      void 0,
      input.map((link) => link.id)
    )
  },
  async (locationIds, { container }) => {
    if (!locationIds?.length) {
      return
    }

    const stockLocationService = container.resolve<IStockLocationService>(
      Modules.STOCK_LOCATION
    )

    await unlink(stockLocationService, locationIds)
  }
)
