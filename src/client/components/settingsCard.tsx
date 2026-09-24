/**
 * The keypool card in the Plugin Manager page, registered on the
 * `plugins.item` slot. Renders a one-liner description in `summary` view
 * and the pool configuration with member toggles in `page` view.
 * Member key names are read-only (from cordis.patch.yml), but member
 * enable/disable state is per-user writable through `ctx.configForms`.
 */

import type * as ReactNS from 'react'
import { React } from '../react'
import type { PoolInfo, SettingsState } from '../settings'

export interface SettingsCardProps {
  view: 'summary' | 'page'
  useKeypoolSettings?: <T>(selector: (state: SettingsState) => T) => T
  toggleMember?: (member: string) => void
}

interface PoolBlockProps {
  pool: PoolInfo
  disabled: string[]
  t: (key: string) => string
  onToggleMember: (member: string) => void
}

function PoolBlock(props: PoolBlockProps): ReactNS.ReactElement {
  const { pool, disabled, t, onToggleMember } = props
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
              return (
                <span key={m} className="lc-settings-member-row">
                  <code className={'lc-settings-member-name' + (isDisabled ? ' lc-settings-member-name-disabled' : '')}>
                    {m}
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
    if (props.view === 'summary') return <>{t('settings.desc')}</>
    const state = typeof props.useKeypoolSettings === 'function' ? props.useKeypoolSettings(s => s) : undefined
    if (state === undefined || state.status === 'unavailable') return null
    const toggleMember = props.toggleMember ?? (() => {})
    return (
      <div className="lc-settings-body">
        <p className="lc-settings-note" role="status">{t('settings.readOnly')}</p>
        {state.pools.length === 0
          ? <p className="lc-settings-empty">{t('settings.readOnly')}</p>
          : state.pools.map(pool => (
            <PoolBlock
              key={pool.name}
              pool={pool}
              disabled={state.disabled}
              t={t}
              onToggleMember={toggleMember}
            />
          ))}
      </div>
    )
  }
}
