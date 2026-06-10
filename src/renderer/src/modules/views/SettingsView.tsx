import { useEffect, useState } from 'react'
import type { AppSettings, AIProviderId, Language } from '@shared/settings'
import { MODELS } from '@shared/settings'
import { useOnboarding } from '../../store/useOnboarding'

/** Modulo Settings & AI Config (Epic 22). API key sicura, provider/modello, modalità, lingua. */
export function SettingsView(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const showOnboarding = useOnboarding((s) => s.setVisible)

  const reload = async (): Promise<void> => setSettings(await window.authoros.settings.get())
  useEffect(() => {
    void reload()
  }, [])

  if (!settings) return <p className="text-muted">Caricamento…</p>

  const patch = async (p: Parameters<typeof window.authoros.settings.update>[0]): Promise<void> => {
    setSaving(true)
    setSettings(await window.authoros.settings.update(p))
    setSaving(false)
  }

  const liveProvider = settings.provider === 'mock' ? null : settings.provider
  const hasKeyFor = (p: AIProviderId): boolean =>
    p === 'anthropic' ? settings.hasAnthropicKey : p === 'openai' ? settings.hasOpenaiKey : true

  const saveKey = async (): Promise<void> => {
    if (!liveProvider || !keyInput.trim()) return
    setSettings(await window.authoros.settings.setKey(liveProvider, keyInput.trim()))
    setKeyInput('')
  }
  const clearKey = async (): Promise<void> => {
    if (!liveProvider) return
    setSettings(await window.authoros.settings.clearKey(liveProvider))
  }

  const inputCls =
    'rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm outline-none focus:border-cyan'
  const models = liveProvider ? MODELS[liveProvider] : []

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold">Impostazioni</h2>
      <p className="mt-1 text-muted">
        Configura l'AI. In modalità <strong>mock</strong> nessun dato viene inviato in rete; in
        modalità <strong>reale</strong> serve la tua API key.
      </p>

      {/* Provider & modalità */}
      <section className="mt-6 space-y-3 rounded-2xl border border-line bg-panel/50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">AI</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted">Provider</label>
          <select
            className={inputCls}
            value={settings.provider}
            onChange={(e) => patch({ provider: e.target.value as AIProviderId })}
          >
            <option value="mock">Mock (nessun costo)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
          </select>

          {liveProvider && (
            <>
              <label className="text-sm text-muted">Modello</label>
              <select
                className={inputCls}
                value={settings.model}
                onChange={(e) => patch({ model: e.target.value })}
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-muted">Modalità</label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={settings.mode === 'mock'}
              onChange={() => patch({ mode: 'mock' })}
            />
            Mock
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={settings.mode === 'live'}
              onChange={() => patch({ mode: 'live' })}
            />
            Reale
          </label>
          {settings.mode === 'live' && liveProvider && !hasKeyFor(liveProvider) && (
            <span className="text-xs text-yellow">⚠ Inserisci una API key per usare l'AI reale</span>
          )}
        </div>
      </section>

      {/* API key */}
      {liveProvider && (
        <section className="mt-4 space-y-3 rounded-2xl border border-line bg-panel/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan">
            API key · {liveProvider}
          </h3>
          <p className="text-xs text-muted">
            La chiave è cifrata nel keychain del sistema operativo e non lascia mai questo computer
            se non per le chiamate al provider (US-22.5).
          </p>
          <div className="flex items-center gap-2">
            <input
              className={`${inputCls} flex-1`}
              type="password"
              placeholder={hasKeyFor(liveProvider) ? '•••••••• (configurata)' : 'Incolla la tua API key'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
            <button
              className="rounded-lg bg-cyan px-3 py-2 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-50"
              onClick={saveKey}
              disabled={!keyInput.trim()}
            >
              Salva
            </button>
            {hasKeyFor(liveProvider) && (
              <button
                className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:border-red hover:text-red"
                onClick={clearKey}
              >
                Rimuovi
              </button>
            )}
          </div>
        </section>
      )}

      {/* Lingua */}
      <section className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-panel/50 p-4">
        <label className="text-sm text-muted">Lingua interfaccia</label>
        <select
          className={inputCls}
          value={settings.language}
          onChange={(e) => patch({ language: e.target.value as Language })}
        >
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>
        {saving && <span className="text-xs text-muted">Salvataggio…</span>}
      </section>

      {/* Onboarding (Epic 25) */}
      <section className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-panel/50 p-4">
        <span className="text-sm text-muted">Introduzione all'app</span>
        <button
          className="ml-auto rounded-lg border border-line px-3 py-2 text-sm hover:border-cyan"
          onClick={() => showOnboarding(true)}
        >
          Rivedi il tour iniziale
        </button>
      </section>
    </div>
  )
}
