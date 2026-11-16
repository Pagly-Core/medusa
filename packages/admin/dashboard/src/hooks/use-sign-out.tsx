import { useNavigate } from "react-router-dom"

import { queryClient } from "../lib/query-client"
import { useLogout } from "./api/auth"

/**
 * Signs the user out and leaves for the login page.
 */
export const useSignOut = () => {
  const navigate = useNavigate()
  const { mutateAsync } = useLogout()

  return async () => {
    await mutateAsync(undefined, {
      onSuccess: () => {
        queryClient.clear()
        navigate("/login")
      },
    })
  }
}
