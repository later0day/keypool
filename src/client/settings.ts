/**
 * The plugin's settings binding (browser half). The Host-served `keypool`
 * namespace carries the pool configuration snapshot plus a client-managed
 * `disabled` set; the Plugin configuration card (Settings → Plugins) toggles
 * individual member keys on/off through the settings scope.
 */

export interface PoolInfo {
  name: string
  policy: string
  memberCount: number
  members: string[]
}

/** The bound settings scope (ctx.settingsScope.bind result), as consumed. */
export interface SettingsScopeLike {
  getSnapshot(): { status: string; value: unknown; writable: boolean }
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<void>
}

/** The ctx.settingsScope binder face, as consumed. */
export interface SettingsScopeBinderFace {
  bind(spec: { namespace: string }): SettingsScopeLike
}

/** The pool snapshot the card renders. */
export interface SettingsState {
  /** Scope sync: loading until the first Host section, unavailable when unserved. */
  status: 'loading' | 'ready' | 'unavailable'
  pools: PoolInfo[]
  /** Member references the user has disabled. */
  disabled: string[]
  /** Member reference -> truncated credential value (first N + "..." + last N). */
  values: Record<string, string>
  writable: boolean
}

export interface KeypoolSettings {
  /** Observable snapshot store, bound onto card props as `useKeypoolSettings`. */
  store: { subscribe(listener: () => void): () => void; getSnapshot(): SettingsState }
  attach(scope: SettingsScopeLike): () => void
  /** Toggle a member's disabled state and persist it. */
  toggleMember(member: string): void
}

function poolsOf(value: unknown): PoolInfo[] {
  if (value === null || typeof value !== 'object') return []
  const v = value as Record<string, unknown>
  if (!Array.isArray(v.pools)) return []
  return v.pools.filter((p: unknown): p is PoolInfo =>
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

function valuesOf(value: unknown): Record<string, string> {
  if (value === null || typeof value !== 'object') return {}
  const v = value as Record<string, unknown>
  if (v.values === null || typeof v.values !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v.values as Record<string, unknown>)) {
    if (typeof val === 'string') out[k] = val
  }
  return out
}

export function createKeypoolSettings(): KeypoolSettings {
  let state: SettingsState = { status: 'loading', pools: [], disabled: [], values: {}, writable: false }
  let scope: SettingsScopeLike | undefined
  const listeners = new Set<() => void>()
  const publish = (next: SettingsState): void => {
    if (next.status === state.status && next.pools === state.pools
      && next.disabled === state.disabled && next.values === state.values && next.writable === state.writable) return
    state = next
    for (const listener of listeners) listener()
  }
  return {
    store: {
      subscribe(listener) {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
      getSnapshot: () => state,
    },
    attach(bound) {
      scope = bound
      const sync = (): void => {
        const snap = bound.getSnapshot()
        const pools = poolsOf(snap.value)
        const disabled = disabledOf(snap.value)
        const values = valuesOf(snap.value)
        publish({
          status: snap.status === 'ready' || snap.status === 'unavailable' ? snap.status : 'loading',
          pools,
          disabled,
          values,
          writable: snap.writable,
        })
      }
      sync()
      return bound.subscribe(sync)
    },
    toggleMember(member) {
      const next = state.disabled.includes(member)
        ? state.disabled.filter(d => d !== member)
        : [...state.disabled, member]
      publish({ ...state, disabled: next })
      void scope?.set('disabled', next)
    },
  }
}