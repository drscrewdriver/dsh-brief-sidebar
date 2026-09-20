/**
 * The dock-shadow registration contract.
 *
 * The shadow works because of one host invariant: `conversation.input.dock` is a
 * LIST slot whose cells are keyed by `id`, and the slot core sorts entries by
 * ascending `priority` before keeping the first live entry per cell. So the
 * registration below is not a cosmetic detail — the cell id, the priority and
 * the (absent) duplicate-priority collision are the whole mechanism. This file
 * pins all three so a future refactor cannot quietly turn "hidden" into
 * "hidden only sometimes".
 *
 * The official entry it competes with registers `{ id: 'todo', order: 0 }` with
 * the default priority 0; `dsh-input-traffic` uses the identical trick on the
 * sibling `queue` cell, which is the in-the-wild precedent.
 */
import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import {
  TODO_CELL_ID,
  TODO_SHADOW_PRIORITY,
  registerTodoDockShadow,
} from '../src/client/brief/dock-shadow'

/** Options bag accepted by the slot service's `register`. */
type RegisterOptions = Record<string, unknown>

/** The component the shadow registers. */
type RegisteredComponent = (props: unknown) => unknown

/**
 * A context exposing only `get`, mirroring cordis's `ctx.get(name)` accessor —
 * the plugin never reads `ctx.slots` directly because a bare Proxy read can
 * throw on a context that does not carry the service yet.
 */
function ctxWith(slots: unknown): Context {
  return { get: (name: string) => (name === 'slots' ? slots : undefined) } as unknown as Context
}

/** A fake slots service that records the shadow's registration and invokes it. */
function fakeSlots() {
  const disposer = (): void => {}
  const register = vi.fn((_options: RegisterOptions, _component: RegisteredComponent) => disposer)
  const inject = vi.fn((_key: string, callback: () => (() => void) | undefined) => {
    // The real `inject` runs the body once the parent entry declares the slot.
    callback()
    return disposer
  })
  return { service: { inject, register }, inject, register, disposer }
}

describe('registerTodoDockShadow', () => {
  it('waits for the slot declaration instead of registering eagerly', () => {
    const slots = fakeSlots()
    registerTodoDockShadow(ctxWith(slots.service))

    expect(slots.inject).toHaveBeenCalledTimes(1)
    expect(slots.inject.mock.calls[0][0]).toBe('conversation.input.dock')
    expect(typeof slots.inject.mock.calls[0][1]).toBe('function')
  })

  it('claims the official cell id at a lower priority', () => {
    const slots = fakeSlots()
    registerTodoDockShadow(ctxWith(slots.service))

    expect(slots.register).toHaveBeenCalledTimes(1)
    const [options, component] = slots.register.mock.calls[0]
    expect(options).toEqual({
      name: 'conversation.input.dock',
      id: 'todo',
      order: 0,
      priority: -1,
      registrant: 'dsh-brief-sidebar',
    })
    expect(options.priority).toBeLessThan(0)
    expect(component(undefined)).toBeNull()
  })

  it('exposes the cell id and priority as the seam the mechanism depends on', () => {
    expect(TODO_CELL_ID).toBe('todo')
    // The official entry takes the default priority 0, so anything lower wins.
    expect(TODO_SHADOW_PRIORITY).toBeLessThan(0)
  })

  it('returns the inject disposer so unloading restores the official panel', () => {
    const slots = fakeSlots()
    expect(registerTodoDockShadow(ctxWith(slots.service))).toBe(slots.disposer)
  })

  it('degrades to a no-op when the slots service is unreachable', () => {
    expect(registerTodoDockShadow(ctxWith(undefined))).toBeUndefined()
    expect(registerTodoDockShadow(ctxWith({}))).toBeUndefined()
    expect(registerTodoDockShadow(ctxWith({ inject: 'not a function' }))).toBeUndefined()
  })

  it('does not register anything when the slots service is unreachable', () => {
    const slots = fakeSlots()
    registerTodoDockShadow(ctxWith(undefined))
    expect(slots.register).not.toHaveBeenCalled()
  })
})
