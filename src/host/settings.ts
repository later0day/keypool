/**
 * keypool settings — the disabled-member set read from the plugin's volatile
 * Config field. The new SettingsForms API auto-generates the settings card
 * from the plugin's Config schema, so `disabled` (a volatile field) is both
 * the UI toggle target and the runtime read source for member exclusion.
 *
 * The `pools` field is already in Config (declared in cordis.yml), so the
 * settings card displays it read-only. Member enable/disable toggles write
 * the `disabled` array through `settings.update`/`settings.mutate`.
 */

import type { Context } from '@deepseek-ai/cordis'
import { isVolatile } from '@deepseek-ai/cosmokit'
import type { Config } from '../config.ts'

/** Read the current disabled member set from the plugin's volatile Config.
 *
 * The `disabled` field is declared `.volatile()` in the Config schema, so a
 * live settings update reaches it without restarting the provider. A
 * non-volatile value (programmatic construction without schemastery) falls
 * back to an empty disabled set.
 * @param config - the plugin's resolved Config.
 * @returns the set of disabled member references.
 */
export function getDisabledMembers(config: Config): ReadonlySet<string> {
  const disabled = config.disabled
  if (disabled === undefined) return new Set()
  if (isVolatile(disabled)) {
    const value = disabled.get()
    return Array.isArray(value) ? new Set(value) : new Set()
  }
  return Array.isArray(disabled) ? new Set(disabled) : new Set()
}
