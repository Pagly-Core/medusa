import { FetchError } from "@medusajs/js-sdk"
import { toast } from "@medusajs/ui"
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
 *
 * A session that had already ended (401) is signed out all the same. Any
 * other failure leaves the session as it was, so the page stays and says why.
 */
export const useSignOut = () => {
  const navigate = useNavigate()
  const { mutateAsync } = useLogout()

  return async () => {
    try {
      await mutateAsync()
    } catch (error) {
      if (!(error instanceof FetchError) || error.status !== 401) {
        toast.error((error as Error).message)
        return
      }
    }
    // Nothing read as the user who left is kept for the next one.
    queryClient.clear()
    navigate("/login")
  }
}
