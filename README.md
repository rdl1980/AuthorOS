# AuthorOS

> Scrivi il tuo libro più velocemente. Senza perdere la tua voce.

App desktop per scrittori che trasforma un'idea in un libro strutturato, scritto, revisionato e pronto alla pubblicazione. L'AI accelera, l'autore decide.

- 📄 **Backlog prodotto:** [`AuthorOS_Backlog.md`](AuthorOS_Backlog.md) — fonte di verità (20+ epiche, ~126 user story).
- 🖥️ **Backlog visuale:** [`AuthorOS_Visual_Backlog.html`](AuthorOS_Visual_Backlog.html) — generato dal markdown, da aprire nel browser.

## Stack (V1)

- **Electron + React + TypeScript** (build con `electron-vite`, UI con Tailwind).
- **AI ibrida:** `MockProvider` di default, provider reali attivabili con una API key (Epic 22). Tutto passa da un **AI Gateway** provider-agnostico nel main process.
- **Persistenza:** repository su file JSON in Fase 0, dietro un'interfaccia sostituibile con **SQLite + Drizzle** in Fase 1 (schema già cloud-ready).
- **Architettura modulare:** ogni epica è un modulo registrato in `src/renderer/src/modules/registry.ts` (Epic 18).

## Struttura

```
src/
  main/        Processo Electron: finestra, IPC, AI Gateway, repository dati
  preload/     Bridge sicuro (context isolation) → window.authoros
  renderer/    App React: shell, registry moduli, viste, AI Interaction Shell
  shared/      Tipi condivisi (AI, dominio) — cloud-ready
scripts/       generate-backlog-html.mjs (rigenera il backlog visuale)
```

## Sviluppo

```bash
npm install
npm run dev          # avvia l'app in sviluppo
npm run build        # build di produzione
npm run typecheck    # controllo tipi
npm run backlog:html # rigenera AuthorOS_Visual_Backlog.html dal markdown
```

> Dopo ogni modifica a `AuthorOS_Backlog.md`, rilancia `npm run backlog:html` per tenere allineato il backlog visuale.

## Roadmap

- **V1** — desktop stand-alone: scrivere, strutturare, revisionare, esportare.
- **V2** — cloud, account, crediti reali, AI multi-provider, marketing.
- **V3** — ecosistema autore: visual studio, trailer, marketplace, collaborazione.

Vedi il backlog per il dettaglio di epiche, user story e priorità.
