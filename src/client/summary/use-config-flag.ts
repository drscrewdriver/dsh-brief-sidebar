/**
 * The shared `configForms` subscription behind this plugin's section switches.
 *
 * Both memory sections (pinned slots / session recall) gate on one boolean of
 * this plugin's entry config. The plumbing — defensive scope resolution,
 * `useSyncExternalStore`, and a stable absent-snapshot — is identical, so it
 * lives here once; each section passes its own pure resolver, which is what
 * the unit tests pin.
 *
 * A host without `configForms` (or a scope still loading) degrades to the
 * resolver's default instead of throwing inside a render.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { BriefClientConfig, ConfigFormsLike, SettingsScopeSnapshot } from '../scope-face'

/**
 * The snapshot served while no config scope is reachable — every resolver
 * maps it to its own default.
 */
const ABSENT_SNAPSHOT: SettingsScopeSnapshot<BriefClientConfig> = {
  status: 'unavailable',
  value: undefined,
  revision: undefined,
  writable: false,
}

/** A no-op unsubscribe source, kept as one identity so the absent-scope
 *  subscription never thrashes (a store contract requires a disposer). */
const NO_SUBSCRIBE = (): (() => void) => () => {}

/**
 * Read one config switch, live.
 *
 * @param ctx - the client root context handed to the tab body.
 * @param resolve - pure snapshot → boolean resolver (owns the default).
 * @returns the resolved switch value.
 */
export function useConfigFlag(
  ctx: Context | undefined,
  resolve: (snapshot: SettingsScopeSnapshot<BriefClientConfig> | undefined) => boolean,
): boolean {
  const scope = useMemo(() => {
    if (ctx === undefined) return undefined
    const configForms = ctx.get('configForms') as ConfigFormsLike | undefined
    if (configForms === undefined || typeof configForms.get !== 'function') return undefined
    return configForms.get<BriefClientConfig>('dsh-brief-sidebar')
  }, [ctx])

  const subscribe = useCallback(
    (listener: () => void) => scope?.subscribe(listener) ?? NO_SUBSCRIBE(),
    [scope],
  )
  const getSnapshot = useCallback(
    () => scope?.getSnapshot() ?? ABSENT_SNAPSHOT,
    [scope],
  )

  return resolve(useSyncExternalStore(subscribe, getSnapshot, getSnapshot))
}
