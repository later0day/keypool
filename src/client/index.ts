/**
 * keypool — Client half (installed package bundle entry).
 *
 * Registers a settings card in Settings → Plugins → Plugin configuration
 * that displays the pool configuration snapshot and toggles member keys
 * on/off through `ctx.configForms`. The card renders while the Host serves
 * the `@deepseek-ai/dsh-credentials-keypool` namespace.
 */

import { DICT_EN, DICT_ZH } from './i18n'
import { makeSettingsCard } from './components/settingsCard'
import { createKeypoolSettings } from './settings'

import './styles.css'

import { h } from './react'

/** Profile entry id of the keypool credentials provider. */
const KEYPOOL_ENTRY = '@deepseek-ai/dsh-credentials-keypool'

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
  configForms: {
    get: (entryId: string) => { getSnapshot(): unknown; subscribe(listener: () => void): () => void; set(field: string, value: unknown): Promise<boolean> }
    whileServed: (namespaces: readonly string[], register: (served: ReadonlySet<string>) => () => void) => () => void
  }
}

function apply(ctx: ClientCtx): void {
  ctx.effect(() => {
    return ctx.locale.register(KEYPOOL_ENTRY, { zh: DICT_ZH, en: DICT_EN })
  }, 'keypool: dictionaries')
  const t = ctx.locale.bind(KEYPOOL_ENTRY)

  const form = ctx.configForms.get(KEYPOOL_ENTRY)
  const settings = createKeypoolSettings(form)
  const SettingsCard = makeSettingsCard(t)

  ctx.effect(() => ctx.configForms.whileServed([KEYPOOL_ENTRY], () => {
    return ctx.slots.inject('plugins.item', () => {
      return ctx.slots.register(
        { name: 'plugins.item', id: 'keypool', order: 20, label: () => t('settings.title'), locale: KEYPOOL_ENTRY,
          inject: () => ({
            hooks: { keypoolSettings: settings.store },
            toggleMember: (member: string) => { settings.toggleMember(member) },
          }) },
        props => h(SettingsCard, props as Record<string, unknown>),
      )
    })
  }), 'keypool: settings card')
}

module.exports = {
  name: 'keypool',
  inject: ['slots', 'locale', 'configForms'],
  apply,
}
