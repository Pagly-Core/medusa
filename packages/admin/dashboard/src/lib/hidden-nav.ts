/**
 * Pagly: where @pagly/storefront registers the hook that names the nav
 * entries to leave out, on globalThis, as it registers its nav actions and
 * the storefront link hook. The hook answers the routes (`to`) of plugin
 * entries whose whole area the current store cannot use: the plugin knows
 * what each store's backend serves, core does not.
 */
export const HIDDEN_NAV_HOOK_KEY = "__paglyUseHiddenNav"

type UseHiddenNav = () => ReadonlySet<string> | undefined

const NONE: ReadonlySet<string> = new Set()

/**
 * Pagly: the plugin entries to leave out of the sidebars. Nothing without a
 * registered hook. The plugin registers it as its admin loads, before the
 * dashboard renders, so every render calls the same hook.
 */
export const useHiddenNav = (): ReadonlySet<string> => {
  const registered = (globalThis as Record<string, unknown>)[
    HIDDEN_NAV_HOOK_KEY
  ] as UseHiddenNav | undefined

  return registered?.() ?? NONE
}
