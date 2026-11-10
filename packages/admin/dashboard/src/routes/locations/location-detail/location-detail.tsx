import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { useLoaderData, useParams } from "react-router-dom"

import { useStockLocation } from "../../../hooks/api/stock-locations"
import { LocationGeneralSection } from "./components/location-general-section"
import { locationLoader } from "./loader"

import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import { LayoutComposer } from "../../../components/layout-composer"
import { LOCATION_DETAILS_FIELD } from "./constants"

export const LocationDetail = () => {
  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof locationLoader>
  >

  const { location_id } = useParams()
  const {
    stock_location: location,
    isPending: isLoading,
    isError,
    error,
  } = useStockLocation(
    location_id!,
    { fields: LOCATION_DETAILS_FIELD },
    { initialData }
  )

  if (isLoading || !location) {
    return (
      <SingleColumnPageSkeleton sections={3} />
    )
  }

  if (isError) {
    throw error
  }

  // Pagly: one column, the location and its shipping. Sales channels and
  // fulfillment providers are in the location's menu; metadata is hidden.
  return (
    <LayoutComposer
      widgetsZonePrefix="location.details"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      data={location}
      sections={{
        main: (
          <LayoutComposer.Entry id="LocationGeneralSection">
            <LocationGeneralSection location={location} />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}
