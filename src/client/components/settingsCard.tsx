/**
 * The keypool card in Settings → Plugins → Plugin configuration, registered
 * on the framework's `settings.plugin.item` slot keyed on the Host-served
 * `keypool` settings namespace. Pool configuration is read-only (from
 * cordis.patch.yml), but member enable/disable state is per-user writable.
 */

import type * as ReactNS from 'react'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import { React } from '../react'
import type { PoolInfo, SettingsState } from '../settings'

export interface SettingsCardProps {
  useKeypoolSettings?: <T>(selector: (state: SettingsState) => T) => T
  set?: (field: string, value: unknown) => void
  toggleMember?: (member: string) => void
}

/** Truncate a key reference: first N chars + "..." + last N chars. */
function truncateRef(ref: string, n = 4): string {
  if (ref.length <= n + n + 3) return ref
  return ref.slice(0, n) + '...' + ref.slice(-n)
}

interface PoolBlockProps {
  pool: PoolInfo
  disabled: string[]
  values: Record<string, string>
  t: (key: string) => string
  onToggleMember: (member: string) => void
}

function PoolBlock(props: PoolBlockProps): ReactNS.ReactElement {
  const { pool, disabled, values, t, onToggleMember } = props
  const policyLabel = pool.policy === 'manual' ? t('policy.manual') : t('policy.round_robin')
  return (
    <div className="lc-settings-pool">
      <div className="lc-settings-pool-name">{pool.name}</div>
      <div className="lc-settings-kv">
        <span className="lc-settings-kv-label">{t('pool.policy')}</span>
        <span className="lc-settings-kv-value">{policyLabel}</span>
      </div>
      <div className="lc-settings-kv">
        <span className="lc-settings-kv-label">{t('pool.memberCount')}</span>
        <span className="lc-settings-kv-value">
          {pool.members.filter(m => !disabled.includes(m)).length} / {pool.memberCount}
        </span>
      </div>
      <div className="lc-settings-kv">
        <span className="lc-settings-kv-label">{t('pool.members')}</span>
        <span className="lc-settings-kv-value">
          <span className="lc-settings-members">
            {pool.members.map(m => {
              const isDisabled = disabled.includes(m)
              const display = values[m] ?? truncateRef(m)
              return (
                <span key={m} className="lc-settings-member-row">
                  <code className={'lc-settings-member-name' + (isDisabled ? ' lc-settings-member-name-disabled' : '')}>
                    {display}
                  </code>
                  <button
                    type="button"
                    className={'lc-settings-toggle' + (isDisabled ? ' lc-settings-toggle-off' : '')}
                    onClick={() => { onToggleMember(m) }}
                  >
                    {isDisabled ? t('pool.enable') : t('pool.disable')}
                  </button>
                </span>
              )
            })}
          </span>
        </span>
      </div>
    </div>
  )
}

export function makeSettingsCard(t: (key: string) => string): (props: SettingsCardProps) => ReactNS.ReactElement | null {
  return function SettingsCard(props: SettingsCardProps): ReactNS.ReactElement | null {
    const [open, setOpen] = React.useState(false)
    const state = typeof props.useKeypoolSettings === 'function' ? props.useKeypoolSettings(s => s) : undefined
    if (state === undefined || state.status === 'unavailable') return null
    const toggleMember = props.toggleMember ?? (() => {})
    return (
      <li className={'lc-settings-card' + (open ? ' lc-settings-open' : '')}>
        <button
          type="button"
          className="lc-settings-head"
          aria-expanded={open}
          aria-label={`${t(open ? 'settings.collapse' : 'settings.expand')}: ${t('settings.title')}`}
          onClick={() => { setOpen(!open) }}
        >
          <span className="lc-settings-headtext">
            <span className="lc-settings-name">{t('settings.title')}</span>
            <span className="lc-settings-desc">{t('settings.desc')}</span>
          </span>
          <IconChevronDownOutline14 className="lc-settings-chevron" />
        </button>
        {open
          ? (
            <div className="lc-settings-body">
              <p className="lc-settings-note" role="status">{t('settings.readOnly')}</p>
              {state.pools.length === 0
                ? <p className="lc-settings-empty">{t('settings.readOnly')}</p>
                : state.pools.map(pool => (
                  <PoolBlock
                    key={pool.name}
                    pool={pool}
                    disabled={state.disabled}
                    values={state.values}
                    t={t}
                    onToggleMember={toggleMember}
                  />
                ))}
            </div>
          )
          : null}
      </li>
    )
  }
}