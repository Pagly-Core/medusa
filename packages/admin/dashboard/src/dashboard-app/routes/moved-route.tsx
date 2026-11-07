import { Navigate } from "react-router-dom"

/**
 * Pagly: the path a page that moved from `from` to `to` now lives at, keeping
 * whatever followed the old prefix (an id, "/edit") and the query.
 */
export const movedPath = (
  _pathname: string,
  _search: string,
  _from: string,
  _to: string
): string => ""

/** Route element that sends an old URL to where its page moved. */
export const MovedRoute = ({ from: _from, to }: { from: string; to: string }) => {
  return <Navigate to={to} replace />
}
