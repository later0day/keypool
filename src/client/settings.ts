/**
 * The plugin's settings binding (browser half). The Host-served `keypool`
 * profile entry carries the pool configuration (read-only, from cordis.yml)
 * plus a client-managed `disabled` array; the Settings card toggles
 * individual member keys on/off through `ctx.configForms`.
 */

import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { PoolInfo } from '../config.ts'

export type { PoolInfo }

/** The pool snapshot the card renders. */
export interface SettingsState {
  /** Form sync: loading until the first Host section, unavailable when unserved. */
  status: 'loading' | 'ready' | 'unavailable'
  pools: PoolInfo[]
  /** Member references the user has disabled. */
  disabled: string[]
  writable: boolean
}

export interface KeypoolSettings {
  /** Observable snapshot store, bound onto card props as `useKeypoolSettings`. */
  store: { subscribe(listener: () => void): () => void; getSnapshot(): SettingsState }
  /** Toggle a member's disabled state and persist it. */
  toggleMember(member: string): void
}

function poolsOf(value: unknown): PoolInfo[] {
  if (value === null || typeof value !== 'object') return []
  const v = value as Record<string, unknown>
  if (!Array.isArray(v.poolInfo)) return []
  return v.poolInfo.filter((p: unknown): p is PoolInfo =>
    p !== null && typeof p === 'object'
    && typeof (p as Record<string, unknown>).name === 'string'
    && typeof (p as Record<string, unknown>).policy === 'string'
    && typeof (p as Record<string, unknown>).memberCount === 'number'
    && Array.isArray((p as Record<string, unknown>).members))
}

function disabledOf(value: unknown): string[] {
  if (value === null || typeof value !== 'object') return []
  const v = value as Record<string, unknown>
  return Array.isArray(v.disabled) ? v.disabled.filter((d): d is string => typeof d === 'string') : []
}

/**
 * Build the keypool settings store from a shared {@link ConfigForm}.
 * The form reads the Host-served `keypool` entry (pools + disabled) and
 * writes `disabled` toggles back through the settings transport.
 * @param form - the config form for the keypool profile entry.
 * @returns the observable store and toggle action.
 */
export function createKeypoolSettings(form: ConfigForm<unknown>): KeypoolSettings {
  let state: SettingsState = { status: 'loading', pools: [], disabled: [], writable: false }
  const listeners = new Set<() => void>()
  const publish = (next: SettingsState): void => {
    if (next.status === state.status && next.pools === state.pools
      && next.disabled === state.disabled && next.writable === state.writable) return
    state = next
    for (const listener of listeners) listener()
  }
  const sync = (): void => {
    const snap = form.getSnapshot()
    if (snap.status === 'unavailable' || snap.value === undefined) {
      publish({ status: snap.status, pools: [], disabled: [], writable: snap.writable })
      return
    }
    publish({
      status: 'ready',
      pools: poolsOf(snap.value),
      disabled: disabledOf(snap.value),
      writable: snap.writable,
    })
  }
  sync()
  form.subscribe(sync)
  return {
    store: {
      subscribe(listener) {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
      getSnapshot: () => state,
    },
    toggleMember(member) {
      const next = state.disabled.includes(member)
        ? state.disabled.filter(d => d !== member)
        : [...state.disabled, member]
      publish({ ...state, disabled: next })
      void form.set('disabled', next)
    },
  }
}
