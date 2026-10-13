/**
 * Registration of this plugin's projection units: `dshSummaryDeliverables` and
 * `dshSummarySkillUsage`.
 *
 * Both units are OPTIONAL contributions: a composition without the
 * session-projection registry (or an older host) simply never registers them,
 * and the client reads those keys as capability absence — the deliverables and
 * skill-usage sections stay hidden. That is why this module routes through
 * `ctx.inject(['sessionProjections'], …)` (wait for the service, register only
 * when it appears) instead of declaring the service in the plugin's own
 * `inject` list, which would make the whole profile row fail to load.
 *
 * The registry drives every registered unit once per committed session event
 * and lazily replays the in-memory log for late units, so a session's history
 * is folded even when this plugin mounts after work started.
 */
import { z } from 'zod'
import type { Context } from '@deepseek-ai/cordis'
import { applyDeliverablesEvent, CAPS, initDeliverablesState } from './deliverables-fold'
import type { DeliverablesState } from './deliverables-fold'
import { applySkillUsageEvent, CAPS as SKILL_CAPS, initSkillUsageState } from './skill-usage-fold'
import type { SkillUsageState } from './skill-usage-fold'
import { DELIVERABLES_KEY, SKILL_USAGE_KEY } from './keys'
import type { DeliverablesView, SkillUsageView } from './keys'

/**
 * Structural view of the registry this plugin needs. Declared locally on
 * purpose: the plugin has no compile dependency on the session-projection
 * package, and `register` accepts any string key at runtime. Generic over the
 * unit's own state/view pair so both contributions share one shape.
 */
interface ProjectionRegistryLike {
  register<S, V>(definition: {
    key: string
    stateSchema: { parse(value: unknown): unknown }
    init(): S
    apply(state: S, event: { type: string; data: unknown }): S
    wire: { viewSchema: { parse(value: unknown): unknown }; view(state: S): V }
    stateVersion: number
  }): () => void
}

/** Zod schema of the fold state — validates persisted states before replay. */
const stateSchema = z.object({
  turn: z.number(),
  calls: z.record(z.string(), z.object({ turn: z.number(), path: z.string().nullable() })),
  latest: z.object({ turn: z.number(), paths: z.array(z.string()) }).nullable(),
  sessionPaths: z.array(z.string()),
  sessionTotal: z.number(),
})

/** Zod schema of the wire view — validates the payload before it leaves the host. */
const viewSchema = z.object({
  latest: z.object({ turn: z.number(), paths: z.array(z.string()) }).nullable(),
  sessionPaths: z.array(z.string()),
  sessionTotal: z.number(),
})

/**
 * The view memo. The registry compares consecutive `view` results by
 * `Object.is`, so a fresh object per event would republish the key on every
 * unrelated frame. States are immutable references, so a WeakMap keyed by
 * state reuses the view reference until the state really changes.
 */
const viewMemo = new WeakMap<DeliverablesState, DeliverablesView>()

/** State → wire view, reference-stable across unchanged states. */
function view(state: DeliverablesState): DeliverablesView {
  const memoized = viewMemo.get(state)
  if (memoized !== undefined) return memoized
  const next: DeliverablesView = {
    latest: state.latest === null
      ? null
      : { turn: state.latest.turn, paths: state.latest.paths.slice(-CAPS.latest) },
    sessionPaths: state.sessionPaths.slice(0, CAPS.session),
    sessionTotal: state.sessionTotal,
  }
  viewMemo.set(state, next)
  return next
}

/**
 * Register the deliverables projection as an optional contribution.
 *
 * @param ctx - the host context the plugin's `apply` receives.
 * @returns nothing; the registration's disposer rides the injected fiber, so
 *   unloading the plugin removes the key (clients then read capability absence).
 */
export function registerDeliverablesProjection(ctx: Context): void {
  ctx.inject(['sessionProjections'], (injected) => {
    const registry = (injected as unknown as { sessionProjections?: ProjectionRegistryLike })
      .sessionProjections
    if (registry === undefined || typeof registry.register !== 'function') return
    registry.register({
      key: DELIVERABLES_KEY,
      stateSchema,
      init: () => initDeliverablesState(),
      apply: applyDeliverablesEvent,
      wire: { viewSchema, view },
      stateVersion: 0,
    })
  })
}

/** Zod schema of the skill-usage fold state. */
const skillStateSchema = z.object({
  turn: z.number(),
  calls: z.record(z.string(), z.object({ turn: z.number(), skill: z.string() })),
  latest: z.object({ turn: z.number(), names: z.array(z.string()) }).nullable(),
  items: z.array(z.object({ name: z.string(), count: z.number(), lastTurn: z.number() })),
  sessionTotal: z.number(),
  callTotal: z.number(),
})

/** Zod schema of the skill-usage wire view. */
const skillViewSchema = z.object({
  latest: z.object({ turn: z.number(), names: z.array(z.string()) }).nullable(),
  session: z.array(z.object({ name: z.string(), count: z.number(), lastTurn: z.number() })),
  sessionTotal: z.number(),
  callTotal: z.number(),
})

/** Same reference-stability memo as above, for the skill-usage unit. */
const skillViewMemo = new WeakMap<SkillUsageState, SkillUsageView>()

/** State → wire view, reference-stable across unchanged states. */
function skillView(state: SkillUsageState): SkillUsageView {
  const memoized = skillViewMemo.get(state)
  if (memoized !== undefined) return memoized
  const next: SkillUsageView = {
    latest: state.latest === null
      ? null
      : { turn: state.latest.turn, names: state.latest.names.slice(0, SKILL_CAPS.latest) },
    session: state.items.slice(0, SKILL_CAPS.view),
    sessionTotal: state.sessionTotal,
    callTotal: state.callTotal,
  }
  skillViewMemo.set(state, next)
  return next
}

/**
 * Register the skill-usage projection as an optional contribution.
 *
 * @param ctx - the host context the plugin's `apply` receives.
 */
export function registerSkillUsageProjection(ctx: Context): void {
  ctx.inject(['sessionProjections'], (injected) => {
    const registry = (injected as unknown as { sessionProjections?: ProjectionRegistryLike })
      .sessionProjections
    if (registry === undefined || typeof registry.register !== 'function') return
    registry.register({
      key: SKILL_USAGE_KEY,
      stateSchema: skillStateSchema,
      init: () => initSkillUsageState(),
      apply: applySkillUsageEvent,
      wire: { viewSchema: skillViewSchema, view: skillView },
      // 0 = the first published shape of this key.
      stateVersion: 0,
    })
  })
}
