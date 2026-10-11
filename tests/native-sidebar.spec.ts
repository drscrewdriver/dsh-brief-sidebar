/**
 * The native right-sidebar registration contract (0.1.5+ hosts, no
 * better-sidebar). Two stages, both pinned here because each is a host wiring
 * invariant a refactor could break silently:
 *
 * 1. The TYPE: `sidebarRightTabs.register` receives the definition's own `id`
 *    and `kind`, a thunk title, and a guide capsule — the guide entry's `kind`
 *    is what picking it opens, so the type and the capsule must agree.
 * 2. The SEAT: the body registers under `sidebar.right.pane.tab` keyed by the
 *    SAME definition id — the host dispatches a tab's body by `tab.kind` →
 *    type in force → body under the definition's id. A key drift renders the
 *    "nothing can view this" notice instead of the board.
 *
 * Also pinned: the availability probe refuses a host missing any of the three
 * services (≤0.1.2 stays inert, never half-registered), and the disposer
 * unwinds seat-then-type even when the seat disposal throws.
 */
import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { nativeSidebarAvailable, registerNativeBoardTab } from '../src/client/native-sidebar'
import type { NativeTabRegistryLike } from '../src/client/native-sidebar'

/** Build a context serving exactly the named subset of host services. */
function ctxWithServices(services: Record<string, unknown>): Context {
  return { get: (name: string) => services[name] } as unknown as Context
}

/** A fake slot service recording inject/register traffic. */
function fakeSlots() {
  const seatDisposer = vi.fn()
  const register = vi.fn((_options: Record<string, unknown>, _component: unknown) => seatDisposer)
  const inject = vi.fn((_key: string, callback: () => (() => void) | undefined) => {
    callback()
    return seatDisposer
  })
  return { service: { inject, register }, inject, register, seatDisposer }
}

/** A fake tab-type registry recording the staged definition. */
function fakeRegistry() {
  const typeDisposer = vi.fn()
  const register = vi.fn((_definition: Record<string, unknown>) => typeDisposer)
  return { service: { register } as unknown as NativeTabRegistryLike, register, typeDisposer }
}

const DEPS = { id: 'dsh-brief-sidebar:board', kind: 'brief-board', order: 15, t: (k: string) => `t:${k}` }

describe('nativeSidebarAvailable', () => {
  it('is false on a host without the sidebar services (≤0.1.2)', () => {
    expect(nativeSidebarAvailable(ctxWithServices({}))).toBe(false)
  })
  it('is false when only the registry answers (controller must exist too)', () => {
    const registry = fakeRegistry()
    expect(nativeSidebarAvailable(ctxWithServices({ sidebarRightTabs: registry.service }))).toBe(false)
  })
  it('is true when registry, controller and slots all answer', () => {
    const registry = fakeRegistry()
    const slots = fakeSlots()
    const ctx = ctxWithServices({
      sidebarRightTabs: registry.service,
      sidebarRight: {},
      slots: slots.service,
    })
    expect(nativeSidebarAvailable(ctx)).toBe(true)
  })
})

describe('registerNativeBoardTab', () => {
  it('stages the type with definition id, kind and a guide capsule', () => {
    const registry = fakeRegistry()
    const slots = fakeSlots()
    const ctx = ctxWithServices({
      sidebarRightTabs: registry.service,
      sidebarRight: {},
      slots: slots.service,
    })
    registerNativeBoardTab(ctx, registry.service, DEPS)

    expect(registry.register).toHaveBeenCalledTimes(1)
    const definition = registry.register.mock.calls[0][0] as {
      id: string
      kind: string
      title: (address: string) => string
      guide: Array<{ order: number; title: () => string }>
    }
    expect(definition.id).toBe(DEPS.id)
    expect(definition.kind).toBe(DEPS.kind)
    expect(definition.title('any')).toBe('t:tab.title')
    expect(definition.guide).toHaveLength(1)
    expect(definition.guide[0].order).toBe(DEPS.order)
    expect(definition.guide[0].title()).toBe('t:tab.title')
  })

  it('keys the body seat under the SAME id the type registered with', () => {
    const registry = fakeRegistry()
    const slots = fakeSlots()
    const ctx = ctxWithServices({
      sidebarRightTabs: registry.service,
      sidebarRight: {},
      slots: slots.service,
    })
    registerNativeBoardTab(ctx, registry.service, DEPS)

    expect(slots.inject).toHaveBeenCalledTimes(1)
    expect(slots.inject.mock.calls[0][0]).toBe('sidebar.right.pane.tab')
    const options = slots.register.mock.calls[0][0] as { name: string; key: string }
    expect(options.name).toBe('sidebar.right.pane.tab')
    expect(options.key).toBe(DEPS.id)
  })

  it('hands the body the SummaryTab face: t, root ctx, session scope', () => {
    const registry = fakeRegistry()
    const slots = fakeSlots()
    const ctx = ctxWithServices({
      sidebarRightTabs: registry.service,
      sidebarRight: {},
      slots: slots.service,
    })
    registerNativeBoardTab(ctx, registry.service, DEPS)

    const options = slots.register.mock.calls[0][0] as { inject: (sessionId: string) => Record<string, unknown> }
    const props = options.inject('session-7')
    expect(props.t).toBe(DEPS.t)
    expect(props.ctx).toBe(ctx)
    expect(props.scope).toEqual({ sessionId: 'session-7' })
    expect(props.visible).toBe(true)
  })

  it('disposes seat then type, and still reaches the type when the seat throws', () => {
    const registry = fakeRegistry()
    const slots = fakeSlots()
    const ctx = ctxWithServices({
      sidebarRightTabs: registry.service,
      sidebarRight: {},
      slots: slots.service,
    })
    const dispose = registerNativeBoardTab(ctx, registry.service, DEPS)
    slots.seatDisposer.mockImplementation(() => {
      throw new Error('seat exploded')
    })
    expect(() => dispose()).toThrow('seat exploded')
    expect(registry.typeDisposer).toHaveBeenCalledTimes(1)
  })

  it('returns a no-op disposer when the services vanished mid-call', () => {
    const dispose = registerNativeBoardTab(ctxWithServices({}), undefined, DEPS)
    expect(() => dispose()).not.toThrow()
  })
})
