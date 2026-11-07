import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { useLogout } from "../../hooks/api/auth"
import { queryClient } from "../../lib/query-client"
import {
  getSearchEntityShortcuts,
  resolveSearchEntityShortcutLabel,
} from "../../lib/search/search-entities"
import { Shortcut } from "./types"

export const useGlobalShortcuts = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { mutateAsync } = useLogout()

  const handleLogout = async () => {
    await mutateAsync(undefined, {
      onSuccess: () => {
        queryClient.clear()
        navigate("/login")
      },
    })
  }

  const globalShortcuts: Shortcut[] = [
    // "Jump to" entries come from the search entity registry, so apps and
    // plugins customize them through their `search-entities.tsx` definitions.
    ...getSearchEntityShortcuts().map(
      ({ entity, shortcut }): Shortcut => ({
        keys: shortcut.keys,
        label: resolveSearchEntityShortcutLabel(entity, t),
        type: shortcut.type ?? "pageShortcut",
        to: shortcut.to,
      })
    ),
    // The admin shell's own destinations, which belong to no entity.
    {
      keys: {
        Mac: ["G", ","],
      },
      label: t("app.keyboardShortcuts.settings.goToSettings"),
      type: "settingShortcut",
      to: "/settings",
    },
    {
      keys: {
        Mac: ["G", ",", "S"],
      },
      label: t("app.keyboardShortcuts.settings.goToStore"),
      type: "settingShortcut",
      to: "/settings/store",
    },
    {
      keys: {
        Mac: ["G", ",", "W"],
      },
      label: t("app.keyboardShortcuts.settings.goToWorkflows"),
      type: "settingShortcut",
      to: "/settings/workflows",
    },
    {
      keys: {
        Mac: ["G", ",", "M"],
      },
      label: t("app.keyboardShortcuts.settings.goToProfile"),
      type: "settingShortcut",
      to: "/settings/profile",
    },
    // Commands that need app hooks stay built in.
    {
      keys: {
        Mac: ["B", "Y", "E"],
      },
      label: t("actions.logout"),
      type: "commandShortcut",
      callback: () => handleLogout(),
    },
  ]

  return globalShortcuts
}
