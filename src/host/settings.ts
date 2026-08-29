/**
 * keypool settings — the per-user namespace served to browsers through the
 * harness settings seam (`ctx.settings`). The Host half REGISTERS the
 * namespace and writes the pool configuration snapshot; the browser card
 * renders it in Settings → Plugins → Plugin configuration.
 *
 * The `disabled` and `values` fields are managed by the client/provider —
 * the Host only writes the initial pool layout; user toggles and resolved
 * credential values survive restarts.
 *
 * Optional composition: a deployment without a settings provider never runs
 * the inject callback and browsers simply see no card.
 */

import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import type { PoolSpec } from '../types.ts'

/** The namespace is the join key between the Host registration and the browser card. */
export const SETTINGS_NAMESPACE = 'keypool'

const poolInfoSchema = z.object({
  name: z.string(),
  policy: z.union(['round_robin', 'manual'] as const).default('round_robin'),
  memberCount: z.number().default(0),
  members: z.array(z.string()).default([]),
})

export const SettingsSchema = z.object({
  pools: z.array(poolInfoSchema).default([]),
  /** Member references the user has disabled; managed by the client, never overwritten by the Host. */
  disabled: z.array(z.string()).default([]),
  /** Member reference -> truncated credential value (first N + "..." + last N). */
  values: z.dict(z.string()).default({}),
})

/** Resolved shape of the settings section. */
export interface KeypoolSettings {
  pools: { name: string; policy: string; memberCount: number; members: string[] }[]
  disabled: string[]
  values: Record<string, string>
}

/** The scope handle, set once the settings service is injected. */
let scope: SettingsScope<KeypoolSettings> | undefined

/**
 * Serve the keypool namespace and write the resolved pool configuration
 * so the client card can display it. Uses `update` (not `replace`) to
 * preserve the client-managed fields across restarts.
 *
 * After registration, resolves every member credential to its stored value
 * and publishes truncated versions (first N + last N chars) so the browser
 * card can display key content.
 *
 * @param ctx - the cordis context.
 * @param pools - the resolved pool specs from the provider constructor.
 * @param resolveMember - async function that resolves a member reference to its credential value.
 */
export function installSettings(
  ctx: Context,
  pools: Record<string, PoolSpec>,
  resolveMember?: (ref: string) => Promise<string | undefined>,
): void {
  ctx.inject(['settings'], (sctx) => {
    scope = sctx.settings.register(settingsNamespace(SETTINGS_NAMESPACE), SettingsSchema)
    const poolList = Object.entries(pools).map(([name, spec]) => ({
      name,
      policy: spec.policy,
      memberCount: spec.members.length,
      members: spec.members.map(m => String(m)),
    }))
    void scope.update({ pools: poolList }).catch(() => {})
    // Resolve credential values after the settings service is ready (by which
    // point the credential document has been loaded by the base provider).
    if (resolveMember !== undefined) {
      const members = Object.values(pools).flatMap(s => s.members.map(m => String(m)))
      if (members.length > 0) {
        void updateMemberValues(resolveMember, members)
      }
    }
  })
}

/**
 * Write truncated credential values into the settings so the browser card
 * can display key content (first N + last N chars). Fire-and-forget —
 * resolves each member reference, truncates the value, and updates the
 * settings `values` map.
 * @param resolve - async function that resolves a credential reference to its value.
 * @param members - all member references across all pools.
 * @param n - number of chars to show at each end; defaults to 4.
 */
export async function updateMemberValues(
  resolve: (ref: string) => Promise<string | undefined>,
  members: string[],
  n = 4,
): Promise<void> {
  const values: Record<string, string> = {}
  await Promise.all(members.map(async (ref) => {
    try {
      const value = await resolve(ref)
      if (value !== undefined) {
        values[ref] = value.length <= n + n + 3 ? value : value.slice(0, n) + '...' + value.slice(-n)
      }
    } catch {
      // A member that cannot be resolved is simply absent from the values map.
    }
  }))
  if (scope !== undefined) {
    void scope.update({ values }).catch(() => {})
  }
}

/**
 * Read the current disabled member set from the settings scope.
 * Returns an empty set when the scope is not yet available.
 * @returns the set of disabled member references.
 */
export function getDisabledMembers(): ReadonlySet<string> {
  if (scope === undefined) return new Set()
  return new Set(scope.get().disabled)
}