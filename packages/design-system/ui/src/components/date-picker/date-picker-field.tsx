"use client"

import { createCalendar } from "@internationalized/date"
import * as React from "react"
import {
  AriaDatePickerProps,
  DateValue,
  useDateField,
  useLocale,
} from "react-aria"
import { useDateFieldState } from "react-stately"

import { DateSegment } from "@/components/date-segment"
import { cva } from "cva"

interface DatePickerFieldProps extends AriaDatePickerProps<DateValue> {
  size?: "base" | "small"
}

const datePickerFieldStyles = cva({
  base: "flex items-center tabular-nums",
  variants: {
    size: {
      small: "py-1",
      base: "py-1.5",
    },
  },
  defaultVariants: {
    size: "base",
  },
})

// Pagly: the segments a date needs before its time can be filled in.
const DATE_SEGMENTS = new Set(["era", "year", "month", "day"])

const DatePickerField = ({ size = "base", ...props }: DatePickerFieldProps) => {
  const { locale } = useLocale()

  const state = useDateFieldState({
    ...props,
    locale,
    createCalendar,
  })

  const ref = React.useRef<HTMLDivElement>(null)
  const { fieldProps } = useDateField(props, state, ref)

  /**
   * Pagly: a date typed without a time is committed once focus leaves the
   * field, at the placeholder's time (00:00 unless `placeholderValue` says
   * otherwise). react-stately waits for every segment, so it was dropped
   * (Pagly-Core/pagly-app#261).
   */
  const commitDateWithoutTime = (event: React.FocusEvent<HTMLDivElement>) => {
    if (ref.current?.contains(event.relatedTarget as Node | null)) {
      return
    }

    const editable = state.segments.filter((segment) => segment.isEditable)
    const dateDone = editable
      .filter((segment) => DATE_SEGMENTS.has(segment.type))
      .every((segment) => !segment.isPlaceholder)
    const missingTime = editable.filter(
      (segment) => !DATE_SEGMENTS.has(segment.type) && segment.isPlaceholder
    )

    if (state.value || !dateDone || !missingTime.length) {
      return
    }

    missingTime.forEach((segment) => {
      state.setSegment(segment.type, segment.value ?? 0)
    })
  }

  return (
    <div
      ref={ref}
      aria-label="Date input"
      className={datePickerFieldStyles({ size })}
      {...fieldProps}
      onBlur={(event) => {
        fieldProps.onBlur?.(event)
        commitDateWithoutTime(event)
      }}
    >
      {state.segments.map((segment, index) => {
        return <DateSegment key={index} segment={segment} state={state} />
      })}
    </div>
  )
}

export { DatePickerField }
