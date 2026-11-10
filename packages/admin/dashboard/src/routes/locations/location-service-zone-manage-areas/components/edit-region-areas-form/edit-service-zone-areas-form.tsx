import { zodResolver } from "@hookform/resolvers/zod"
import { HttpTypes } from "@medusajs/types"
import { Button, Heading, toast } from "@medusajs/ui"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import {
  RouteFocusModal,
  StackedFocusModal,
  useRouteModal,
} from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useUpdateFulfillmentSetServiceZone } from "../../../../../hooks/api/fulfillment-sets"
import { countries } from "../../../../../lib/data/countries"
import { GeoZoneForm } from "../../../common/components/geo-zone-form"
import { GEO_ZONE_STACKED_MODAL_ID } from "../../../common/constants"
import {
  addedConflicts,
  areaConflicts,
  fromGeoZones,
  keptGeoZones,
  toGeoZones,
  type OtherZone,
} from "../../../common/utils/geo-zone-areas"

// Pagly: a zone keeping city or zip areas may list no country of its own.
const editServiceZoneSchema = (minCountries: number) =>
  z.object({
    countries: z
      .array(
        z.object({
          iso_2: z.string().min(2),
          display_name: z.string(),
          // Pagly: the provinces it covers; none is the whole country.
          provinces: z.array(z.string()).optional(),
        })
      )
      .min(minCountries),
  })

type EditServiceZoneAreas = z.infer<ReturnType<typeof editServiceZoneSchema>>

type EditServiceZoneAreasFormProps = {
  fulfillmentSetId: string
  locationId: string
  zone: HttpTypes.AdminServiceZone
  /** Pagly: the set's other zones, whose areas this one can't take. */
  otherZones?: OtherZone[]
}

export function EditServiceZoneAreasForm({
  fulfillmentSetId,
  locationId,
  zone,
  otherZones = [],
}: EditServiceZoneAreasFormProps) {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  // Pagly: a zone's provinces come back under their country; its city and
  // zip areas aren't the form's, and are resent as they are.
  const initial = useMemo(
    () =>
      fromGeoZones(
        zone.geo_zones,
        (iso2) =>
          countries.find((c) => c.iso_2 === iso2.toLowerCase())
            ?.display_name || iso2.toUpperCase()
      ),
    [zone.geo_zones]
  )
  const kept = useMemo(() => keptGeoZones(zone.geo_zones), [zone.geo_zones])
  // Pagly: the overlaps the zone already had, which an edit may keep.
  const overlappedBefore = useMemo(
    () => areaConflicts(initial, otherZones),
    [initial, otherZones]
  )

  const form = useForm<EditServiceZoneAreas>({
    defaultValues: {
      countries: initial,
    },
    resolver: zodResolver(editServiceZoneSchema(kept.length ? 0 : 1)),
  })

  const { mutateAsync: editServiceZone, isPending: isLoading } =
    useUpdateFulfillmentSetServiceZone(fulfillmentSetId, zone.id)

  // Pagly: an area sits in one zone of a set; the field says which. An edit
  // can't add an overlap, but can keep or shrink one the zone already had.
  const overlapsAdded = (values: EditServiceZoneAreas["countries"]) =>
    addedConflicts(areaConflicts(values, otherZones), overlappedBefore).length > 0
  const overlaps = overlapsAdded(form.watch("countries") ?? [])

  const handleSubmit = form.handleSubmit(async (data) => {
    if (overlapsAdded(data.countries)) {
      return
    }

    await editServiceZone(
      {
        // Pagly: a country covered by some of its provinces saves them.
        geo_zones: [
          ...toGeoZones(data.countries),
          ...(kept as HttpTypes.AdminUpdateFulfillmentSetServiceZone["geo_zones"] & object),
        ],
      },
      {
        onSuccess: () => {
          toast.success(
            t("stockLocations.serviceZones.manageAreas.successToast", {
              name: zone.name,
            })
          )

          handleSuccess(`/settings/locations/${locationId}`)
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  })

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        className="flex h-full flex-col overflow-hidden"
        onSubmit={handleSubmit}
      >
        <RouteFocusModal.Header />

        <RouteFocusModal.Body className="flex flex-1 flex-col overflow-auto">
          <StackedFocusModal id={GEO_ZONE_STACKED_MODAL_ID}>
            <div className="flex flex-col items-center p-16">
              <div className="flex w-full max-w-[720px] flex-col gap-y-8">
                <Heading>
                  {t("stockLocations.serviceZones.manageAreas.header", {
                    name: zone.name,
                  })}
                </Heading>
                <GeoZoneForm form={form} otherZones={otherZones} />
              </div>
            </div>

            <GeoZoneForm.AreaDrawer form={form} otherZones={otherZones} />
          </StackedFocusModal>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button type="submit" size="small" isLoading={isLoading} disabled={overlaps}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}
