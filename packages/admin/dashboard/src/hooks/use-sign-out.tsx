import { useNavigate } from "react-router-dom"

import { queryClient } from "../lib/query-client"
import { useLogout } from "./api"

/**
 * Signs the user out and leaves for the login page.
 *
 * What follows the sign-out is awaited here, never passed to the mutation as
 * a per-call callback: those are dropped once the component that started the
 * mutation unmounts, and a menu item unmounts as its menu closes. On any
 * connection slower than the menu's closing, the session ended and the page
 * stayed where it was until a reload.
 */
export const useSignOut = () => {
  const navigate = useNavigate()
  const { mutateAsync } = useLogout()

  return async () => {
    await mutateAsync()
    // Nothing read as the user who left is kept for the next one.
    queryClient.clear()
    navigate("/login")
  }
}
