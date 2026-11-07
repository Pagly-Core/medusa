import { Navigate, useLocation } from "react-router-dom"

/**
 * Pagly: the path a page that moved from `from` to `to` now lives at, keeping
 * whatever followed the old prefix (an id, "/edit") and the query.
 */
export const movedPath = (
  pathname: string,
  search: string,
  from: string,
  to: string
): string => {
  const rest = pathname.startsWith(from) ? pathname.slice(from.length) : ""
  return `${to}${rest}${search}`
}

/** Route element that sends an old URL to where its page moved. */
export const MovedRoute = ({ from, to }: { from: string; to: string }) => {
  const { pathname, search } = useLocation()
  return <Navigate to={movedPath(pathname, search, from, to)} replace />
}
