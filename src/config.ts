/**
 * Plugin config for the key-pool credentials provider — the request the
 * provider resolves into runtime {@link PoolSpec}s. It is a superset of the
 * file-backed provider's config — the same `path`/`dshHome`/`watch`/`debounceMs`
 * fields govern the underlying document — plus a declarative `pools` map that
 * turns one pool reference into a rotation over member references.
 *
 * References are plain strings here, not branded {@link CredentialRef}s: config
 * is the untrusted request surface, and the provider brands each member once at
 * construction (failing loud on a malformed reference), so the branded type
 * never leaks into what a `cordis.yml` author must write.
 * @module @deepseek-ai/dsh-credentials-keypool/config
 */

import z from '@deepseek-ai/schemastery'
import type { Volatile } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { Policy, PoolSpec } from './types.ts'

/** Rotation policies as a closed schema union; the type stays authoritative. */
const POLICIES = ['round_robin', 'manual'] as const satisfies readonly Policy[]

/** Policy applied when a pool omits one, in both the schema and {@link resolvePools}. */
const DEFAULT_POLICY: Policy = 'round_robin'

/** One pool as declared in config: policy, non-empty member names, optional pinned member. */
export interface PoolConfig {
  /** Rotation policy applied on each resolution; defaults to `round_robin`. */
  policy?: Policy
  /** Member reference names rotated over, in declaration order; never empty. */
  members: string[]
  /** The pinned member name for `manual`; defaults to the first member. */
  active?: string
}

/** Pool display metadata: name, policy, and member references for the settings card. */
export interface PoolInfo {
  /** Pool reference name an adapter asks for. */
  name: string
  /** Rotation policy applied on each resolution. */
  policy: Policy
  /** Total member count in declaration order. */
  memberCount: number
  /** Member reference names rotated over. */
  members: string[]
}

/** One pool's declarative schema: policy, non-empty members, optional pinned member. */
const poolConfig: z<PoolConfig> = z.object({
  policy: z.union(POLICIES).default(DEFAULT_POLICY),
  members: z.array(z.string()).min(1),
  active: z.string().required(false),
})

/** Display schema for one pool as the settings card renders it. */
const poolInfo: z<PoolInfo> = z.object({
  name: z.string(),
  policy: z.union(POLICIES).default(DEFAULT_POLICY),
  memberCount: z.number().default(0),
  members: z.array(z.string()).default([]),
})

/**
 * Plugin config: the file-backed document fields plus the pool declarations.
 * A pool reference absent from `pools` resolves straight through to the
 * underlying provider, so enabling this plugin with an empty map is a no-op
 * over the file provider. The `disabled` volatile field stores member
 * references the user has toggled off in the Settings card; the new
 * SettingsForms API auto-generates the toggle UI from it.
 */
export interface Config {
  /** Credentials document path; defaults to `.credentials.yaml` under the harness home. */
  path?: string
  /** Harness home used when `path` is omitted; defaults to `$DSH_HOME` or `~/.dsh`. */
  dshHome?: string
  /** Watch the document and hot-publish external edits; defaults to true. */
  watch?: boolean
  /** Watcher write-settle window in milliseconds; defaults to 100. */
  debounceMs?: number
  /** Pool declarations keyed by the pool reference the adapter asks for. */
  pools?: Record<string, PoolConfig>
  /** Display metadata for the settings card; written by the Host from resolved pools. */
  poolInfo?: Volatile<PoolInfo[]>
  /** Member references the user has disabled from rotation; managed through the Settings card. */
  disabled?: Volatile<string[]>
}

/** Config schema; `pools` and `disabled` default to empty so the plugin is inert until declared. */
export const Config = z.object({
  path: z.string(),
  dshHome: z.string(),
  watch: z.boolean().default(true),
  debounceMs: z.number().min(0).default(100),
  pools: z.dict(poolConfig).default({}),
  poolInfo: z.array(poolInfo).default([]).volatile(),
  disabled: z.array(z.string()).default([]).volatile(),
})

/**
 * Resolve the declarative pool config into runtime {@link PoolSpec}s, branding
 * every member and pinned reference through the seam's POSIX-identifier check.
 * This is the explicit request-to-spec step: a malformed reference fails here,
 * at load, rather than at first resolution. An omitted `pools` (programmatic
 * construction bypassing Schemastery's default) resolves to no pools.
 * @param pools - the raw pool declarations, or `undefined`.
 * @returns the branded pool specs keyed by pool reference.
 */
export function resolvePools(pools: Record<string, PoolConfig> | undefined): Record<string, PoolSpec> {
  const resolved: Record<string, PoolSpec> = {}
  for (const [ref, config] of Object.entries(pools ?? {})) {
    // Brand the pool reference too: it is what an adapter asks for, so it must
    // be a valid reference even though its members carry the stored values.
    credentialRef(ref)
    resolved[ref] = {
      policy: config.policy ?? DEFAULT_POLICY,
      members: config.members.map(credentialRef),
      ...config.active === undefined ? {} : { active: credentialRef(config.active) },
    }
  }
  return resolved
}
