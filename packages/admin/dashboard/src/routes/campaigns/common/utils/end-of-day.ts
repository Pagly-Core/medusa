/**
 * Pagly: the placeholder an end date picker takes, so a day picked or typed
 * without a time ends at 23:59 instead of 00:00, which ended a campaign a day
 * early (Pagly-Core/pagly-app#261). Only its time is used.
 */
export const endOfDayPlaceholder = () => {
  const date = new Date()
  date.setHours(23, 59, 0, 0)
  return date
}
