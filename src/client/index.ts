/**
 * keypool — Client half (installed package bundle entry).
 *
 * Registers a read-only settings card in Settings → Plugins → Plugin
 * configuration that displays the pool configuration snapshot written by
 * the Host half at startup.
 */

import { DICT_EN, DICT_ZH } from './i18n'
import { makeSettingsCard } from './components/settingsCard'
import { createKeypoolSettings, type SettingsScopeBinderFace } from './settings'

import './styles.css'

import { h } from './react'

const NS = 'keypool'

interface ClientCtx {
  effect: (fn: () => (() => void) | void, label?: string) => void
  locale: {
    register: (ns: string, dicts: Record<string, Record<string, string>>) => () => void
    bind: (ns: string) => (key: string) => string
  }
  slots: {
    inject: (name: string, factory: () => { dispose?: () => void }) => void
    register: (options: Record<string, unknown>, component: (props: Record<string, unknown>) => unknown) => unknown
  }
  inject: (deps: string[], callback: (ctx: Record<string, unknown>) => void) => void
}

function apply(ctx: ClientCtx): void {
  ctx.effect(() => {
    return ctx.locale.register(NS, { zh: DICT_ZH, en: DICT_EN })
  }, 'keypool: dictionaries')
  const t = ctx.locale.bind(NS)

  const settings = createKeypoolSettings()
  const SettingsCard = makeSettingsCard(t)

  ctx.inject(['settingsScope'], (raw) => {
    const c = raw as ClientCtx & { settingsScope?: SettingsScopeBinderFace }
    const binder = c.settingsScope
    if (binder === undefined) return
    ctx.effect(() => settings.attach(binder.bind({ namespace: NS })), 'keypool: settings scope')
    ctx.slots.inject('settings.plugin.item', () => {
      return ctx.slots.register(
        { name: 'settings.plugin.item', key: NS, locale: NS,
          inject: () => ({
            hooks: { keypoolSettings: settings.store },
            toggleMember: (member: string) => { settings.toggleMember(member) },
          }) },
        props => h(SettingsCard, props as Record<string, unknown>),
      )
    })
  })
}

module.exports = {
  name: 'keypool',
  inject: ['slots', 'locale'],
  apply,
}