import { TriangleDownMini } from "@medusajs/icons"
import { Button, Checkbox, Heading, Hint, Label, Text, clx } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import {
  OnChangeFn,
  RowSelectionState,
  createColumnHelper,
} from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import { UseFormReturn, useFieldArray } from "react-hook-form"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ChipGroup } from "../../../../../components/common/chip-group"
import { Form } from "../../../../../components/common/form"
import {
  StackedFocusModal,
  useStackedModal,
} from "../../../../../components/modals"
import { _DataTable } from "../../../../../components/table/data-table"
import { useDataTable } from "../../../../../hooks/use-data-table"
import {
  StaticCountry,
  countries as staticCountries,
} from "../../../../../lib/data/countries"
import { useCountries } from "../../../../regions/common/hooks/use-countries"
import { useCountryTableColumns } from "../../../../regions/common/hooks/use-country-table-columns"
import { useCountryTableQuery } from "../../../../regions/common/hooks/use-country-table-query"
import { GEO_ZONE_STACKED_MODAL_ID } from "../../constants"
import {
  areaChip,
  areaConflicts,
  countryCheck,
  coversProvince,
  provinceCount,
  provinceName,
  registeredProvinces,
  retickedCountry,
  takenIn,
  toggleCountry,
  toggleProvince,
  zoneCountries,
  type AreaCountry,
  type OtherZone,
} from "../../utils/geo-zone-areas"

const GeoZoneSchema = z.object({
  countries: z.array(
    // Pagly: the provinces a country is covered by; none is the whole country.
    z.object({
      iso_2: z.string().min(2),
      display_name: z.string(),
      provinces: z.array(z.string()).optional(),
    })
  ),
})

type GeoZoneFormImplProps<TForm extends UseFormReturn<any>> = {
  form: TForm
  /** Pagly: the set's other zones, whose areas this one can't take. */
  otherZones?: OtherZone[]
}

const GeoZoneFormImpl = <TForm extends UseFormReturn<any>>({
  form,
  otherZones = [],
}: GeoZoneFormImplProps<TForm>) => {
  const castForm = form as unknown as UseFormReturn<
    z.infer<typeof GeoZoneSchema>
  >

  const { t } = useTranslation()

  const { fields, remove, replace } = useFieldArray({
    control: castForm.control,
    name: "countries",
    keyName: "iso_2",
  })

  const handleClearAll = () => {
    replace([])
  }

  validateForm(form)

  return (
    <Form.Field
      control={form.control}
      name="countries"
      render={() => {
        return (
          <Form.Item>
            <div className="flex items-center justify-between gap-x-4">
              <div>
                <Form.Label>
                  {t("stockLocations.serviceZones.manageAreas.label")}
                </Form.Label>
                <Form.Hint>
                  {t("stockLocations.serviceZones.manageAreas.hint")}
                </Form.Hint>
              </div>
              <StackedFocusModal.Trigger asChild>
                <Button size="small" variant="secondary" type="button">
                  {t("stockLocations.serviceZones.manageAreas.action")}
                </Button>
              </StackedFocusModal.Trigger>
            </div>
            <Form.ErrorMessage />
            <Form.Control className="mt-0">
              {fields.length > 0 && (
                <ChipGroup
                  onClearAll={handleClearAll}
                  onRemove={remove}
                  className="py-4"
                >
                  {/* Pagly: a chip says which of the country's provinces the zone covers. */}
                  {/* (A field array's iso_2 is its key, so the values come from the form.) */}
                  {(castForm.watch("countries") ?? []).map((country, index) => (
                    <ChipGroup.Chip key={country.iso_2} index={index}>
                      {chipLabel(country, t)}
                    </ChipGroup.Chip>
                  ))}
                </ChipGroup>
              )}
            </Form.Control>
            {/* Pagly: what another zone of the set already covers. */}
            {(castForm.watch("countries") ?? []).flatMap((country) =>
              areaConflicts([country], otherZones).map((conflict, index) => (
                <Hint key={`${conflict.iso_2}-${index}`} variant="error">
                  {t("stockLocations.serviceZones.manageAreas.inOtherZone", {
                    count: conflict.areas.length,
                    areas: conflict.areas
                      .map((area) => (area === country.iso_2 ? country.display_name : provinceName(area)))
                      .join(", "),
                    zone: conflict.zone.name,
                  })}
                </Hint>
              ))
            )}
          </Form.Item>
        )
      }}
    />
  )
}

/** Pagly: "Uruguay", "Uruguay · Maldonado, Rocha" or "Uruguay · 18 of 19". */
const chipLabel = (country: AreaCountry, t: TFunction) => {
  const chip = areaChip(country)
  if (chip.kind === "whole") return country.display_name
  const covered =
    chip.kind === "names"
      ? chip.names.join(", ")
      : t("stockLocations.serviceZones.manageAreas.someOfAll", { count: chip.count, total: chip.total })
  return `${country.display_name} · ${covered}`
}

/**
 * Pagly: the countries a zone can cover (the store's), each with its
 * provinces collapsed under it. One another zone of the set holds reads as
 * that zone's and can't be ticked.
 */
const ZoneAreaList = ({
  countries,
  areas,
  otherZones,
  onChange,
}: {
  countries: { iso_2: string; display_name: string }[]
  areas: AreaCountry[]
  otherZones: OtherZone[]
  onChange: (areas: AreaCountry[]) => void
}) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-4 px-2 py-16">
      <Heading>{t("stockLocations.serviceZones.manageAreas.label")}</Heading>
      <div className="shadow-elevation-card-rest bg-ui-bg-base divide-y overflow-hidden rounded-lg">
        {countries.map((country) => {
          const taken = takenIn(otherZones, country.iso_2)
          const provinces = registeredProvinces(country.iso_2)
          const area = areas.find((one) => one.iso_2.toLowerCase() === country.iso_2.toLowerCase())
          const check = countryCheck(areas, country.iso_2, taken)
          const expanded = !!open[country.iso_2]
          const picked = area ? provinceCount(area).count : 0

          return (
            <div key={country.iso_2}>
              <div className="flex items-center gap-x-3 px-4 py-3">
                <Checkbox
                  id={`zone-area-${country.iso_2}`}
                  aria-label={country.display_name}
                  checked={check}
                  // A country another zone holds whole can still be given up.
                  disabled={!!taken.whole && !area}
                  onCheckedChange={() => onChange(toggleCountry(areas, country, taken))}
                />
                <button
                  type="button"
                  className="flex flex-1 items-center gap-x-2 text-left outline-none"
                  aria-expanded={expanded}
                  disabled={!provinces.length}
                  onClick={() => setOpen((prev) => ({ ...prev, [country.iso_2]: !expanded }))}
                >
                  <Text size="small" leading="compact" weight="plus" className="flex-1">
                    {country.display_name}
                  </Text>
                  {taken.whole ? (
                    <Text size="small" leading="compact" className="text-ui-fg-muted">
                      {taken.whole.name}
                    </Text>
                  ) : picked > 0 && picked < provinces.length ? (
                    <Text size="small" leading="compact" className="text-ui-fg-subtle">
                      {t("stockLocations.serviceZones.manageAreas.someOfAll", {
                        count: picked,
                        total: provinces.length,
                      })}
                    </Text>
                  ) : null}
                  {provinces.length > 0 && (
                    <TriangleDownMini
                      className={clx("text-ui-fg-muted transition-transform", expanded && "rotate-180")}
                    />
                  )}
                </button>
              </div>
              {expanded && (
                <div className="bg-ui-bg-subtle divide-y">
                  {provinces.map((province) => {
                    const holder = taken.whole ?? taken.provinces[province.code]
                    const on = coversProvince(area, province.code)
                    const id = `zone-area-${province.code}`
                    return (
                      <div key={province.code} className="flex items-center gap-x-3 py-2.5 pl-11 pr-4">
                        <Checkbox
                          id={id}
                          checked={on}
                          // One another zone holds can be given up, never taken.
                          disabled={!!holder && !on}
                          onCheckedChange={() => onChange(toggleProvince(areas, country, province.code, taken))}
                        />
                        <Label
                          htmlFor={id}
                          size="small"
                          className={clx("flex-1", holder && !on && "text-ui-fg-disabled")}
                        >
                          {province.name}
                        </Label>
                        {holder && (
                          <Text size="small" leading="compact" className="text-ui-fg-muted">
                            {holder.name}
                          </Text>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

type AreasStackedModalProps<TForm extends UseFormReturn<any>> = {
  form: TForm
  /** Pagly: the set's other zones, whose areas this one can't take. */
  otherZones?: OtherZone[]
}

const PREFIX = "ac"
const PAGE_SIZE = 50

const AreaStackedModal = <TForm extends UseFormReturn<any>>({
  form,
  otherZones = [],
}: AreasStackedModalProps<TForm>) => {
  const castForm = form as unknown as UseFormReturn<
    z.infer<typeof GeoZoneSchema>
  >

  const { t } = useTranslation()
  const { getValues, setValue } = castForm
  const { setIsOpen, getIsOpen } = useStackedModal()

  const open = getIsOpen(GEO_ZONE_STACKED_MODAL_ID)

  const [selection, setSelection] = useState<RowSelectionState>({})
  const [state, setState] = useState<
    { iso_2: string; display_name: string; provinces?: string[] }[]
  >([])

  const { searchParams, raw } = useCountryTableQuery({
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  })
  const { countries, count } = useCountries({
    countries: staticCountries.map((c) => ({
      display_name: c.display_name,
      name: c.name,
      iso_2: c.iso_2,
      iso_3: c.iso_3,
      num_code: c.num_code,
    })),
    ...searchParams,
  })

  useEffect(() => {
    if (!open) {
      return
    }

    const countries = getValues("countries")

    if (countries) {
      setState(
        countries.map((country) => ({
          iso_2: country.iso_2,
          display_name: country.display_name,
          // Pagly: a country kept keeps its provinces.
          provinces: country.provinces,
        }))
      )

      setSelection(
        countries.reduce(
          (acc, country) => ({
            ...acc,
            [country.iso_2]: true,
          }),
          {}
        )
      )
    }
  }, [open, getValues])

  const updater: OnChangeFn<RowSelectionState> = (fn) => {
    const value = typeof fn === "function" ? fn(selection) : fn
    const ids = Object.keys(value)

    const addedIdsSet = new Set(ids.filter((id) => value[id] && !selection[id]))

    const addedCountries: AreaCountry[] = []

    if (addedIdsSet.size > 0) {
      const countriesToAdd =
        countries?.filter((country) => addedIdsSet.has(country.iso_2!)) ?? []

      // Pagly: a country unticked and ticked again keeps the zone's provinces.
      const saved = getValues("countries") ?? []
      for (const country of countriesToAdd) {
        addedCountries.push(
          retickedCountry(
            { iso_2: country.iso_2!, display_name: country.display_name! },
            saved
          )
        )
      }
    }

    setState((prev) => {
      const filteredPrev = prev.filter((country) => value[country.iso_2])
      return Array.from(new Set([...filteredPrev, ...addedCountries]))
    })
    setSelection(value)
  }

  const handleAdd = () => {
    setValue("countries", state, {
      shouldDirty: true,
      shouldTouch: true,
    })
    setIsOpen(GEO_ZONE_STACKED_MODAL_ID, false)
  }

  // Pagly: a plugin can limit zones to some countries (the store's), listed
  // with their provinces instead of every country.
  const { data: zoneCountryCodes, isPending: zoneCountriesPending } = useQuery({
    queryKey: ["pagly", "zone-countries"],
    queryFn: () => zoneCountries() ?? Promise.resolve(null),
    retry: false,
  })
  const listed = (zoneCountryCodes ?? []).flatMap((code) => {
    const found = staticCountries.find((country) => country.iso_2 === code)
    return found ? [{ iso_2: found.iso_2, display_name: found.display_name }] : []
  })

  const columns = useColumns()

  const { table } = useDataTable({
    data: countries || [],
    columns,
    count,
    enablePagination: true,
    enableRowSelection: true,
    getRowId: (row) => row.iso_2!,
    pageSize: PAGE_SIZE,
    rowSelection: {
      state: selection,
      updater,
    },
    prefix: PREFIX,
  })

  validateForm(form)

  return (
    <StackedFocusModal.Content className="flex flex-col overflow-hidden">
      <StackedFocusModal.Header>
        <StackedFocusModal.Title asChild>
          <span className="sr-only">
            {t("stockLocations.serviceZones.manageAreas.label")}
          </span>
        </StackedFocusModal.Title>
        <StackedFocusModal.Description asChild>
          <span className="sr-only">
            {t("stockLocations.serviceZones.manageAreas.hint")}
          </span>
        </StackedFocusModal.Description>
      </StackedFocusModal.Header>
      {zoneCountriesPending ? (
        <StackedFocusModal.Body className="flex-1" />
      ) : listed.length ? (
        <StackedFocusModal.Body className="flex flex-1 flex-col items-center overflow-auto">
          <ZoneAreaList countries={listed} areas={state} otherZones={otherZones} onChange={setState} />
        </StackedFocusModal.Body>
      ) : (
      <StackedFocusModal.Body className="flex-1 overflow-hidden">
        <_DataTable
          table={table}
          columns={columns}
          pageSize={PAGE_SIZE}
          count={count}
          search
          pagination
          layout="fill"
          orderBy={[
            { key: "name", label: t("fields.name") },
            { key: "iso_2", label: t("fields.code") },
          ]}
          queryObject={raw}
          prefix={PREFIX}
        />
      </StackedFocusModal.Body>
      )}
      <StackedFocusModal.Footer>
        <div className="flex items-center justify-end gap-x-2">
          <StackedFocusModal.Close type="button" asChild>
            <Button variant="secondary" size="small">
              {t("actions.cancel")}
            </Button>
          </StackedFocusModal.Close>
          <Button size="small" type="button" onClick={handleAdd}>
            {t("actions.save")}
          </Button>
        </div>
      </StackedFocusModal.Footer>
    </StackedFocusModal.Content>
  )
}

const columnHelper = createColumnHelper<StaticCountry>()

const useColumns = () => {
  const base = useCountryTableColumns()

  return useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => {
          return (
            <Checkbox
              checked={
                table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : table.getIsAllPageRowsSelected()
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
            />
          )
        },
        cell: ({ row }) => {
          const isPreselected = !row.getCanSelect()

          return (
            <Checkbox
              checked={row.getIsSelected() || isPreselected}
              disabled={isPreselected}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              onClick={(e) => {
                e.stopPropagation()
              }}
            />
          )
        },
      }),
      ...base,
    ],
    [base]
  )
}

function validateForm(form: UseFormReturn) {
  if (form.getValues("countries") === undefined) {
    throw new Error(
      "The form does not have a field named 'countries'. This field is required to use the GeoZoneForm component."
    )
  }
}

export const GeoZoneForm = Object.assign(GeoZoneFormImpl, {
  AreaDrawer: AreaStackedModal,
})
