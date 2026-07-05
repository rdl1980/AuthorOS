# AuthorOS — Backlog Prodotto

## Vision

**AuthorOS** è un'app per scrittori progettata per trasformare rapidamente un'idea in un libro strutturato, scritto, revisionato e pronto per la pubblicazione.

L'obiettivo non è sostituire l'autore, ma accelerare il processo creativo lasciandogli sempre il controllo manuale.

> L'AI accelera. L'autore decide.

---

## Principi di Prodotto

1. **Scrittura veloce, controllo umano totale**
2. **Prima versione stand-alone**
3. **Evoluzione futura cloud/on-line**
4. **AI avanzata tramite sistema crediti**
5. **UX/UI moderna, modulare e scalabile**
6. **Supporto strutturale a framework narrativi**
7. **Apertura a plugin, nuovi modelli AI e future feature**

---

## Product Goals

- Aiutare l'utente a scrivere un libro molto più velocemente.
- Guidare l'autore nella costruzione di trama, personaggi, mondo narrativo e struttura.
- Offrire generazione testo AI, revisione, marketing e publishing.
- Permettere editing manuale in ogni fase.
- Creare una base stand-alone pronta per evolvere in piattaforma cloud.

---

## Revisioni Backlog

### v2.0 — 2026-06-10 · «Top Tier»
- **Nuova direzione**: elevare AuthorOS da MVP completo a **strumento di fascia alta** per scrittori (benchmark: Scrivener, Ulysses, Sudowrite, Atticus, Dabble). Introdotta la **Roadmap Top-Tier a 3 ondate** e le nuove **Epiche 26–32**.
- **Sprint 0 (bug noti dal collaudo)**: US-21.6 (capitoli fittizi/duplicati all'import) e US-21.7 (numerazione scene "Scena x.y") — priorità assoluta.
- US-3.7 e US-3.8 vengono realizzate dalle US-29.4/29.5 (AI Contestuale).

### v1.2 — 2026-06-10
- **Feedback dal collaudo utente (v0.1.0):** editor scene ora **WYSIWYG** (TipTap) — il Markdown resta il formato di salvataggio ma l'autore scrive testo formattato senza sintassi (reinterpretazione corretta di US-2.4); "Apri" dalla Libreria porta nel Workspace e l'ultimo progetto aperto viene ripristinato all'avvio.
- **Nuova US-21.5:** associazione automatica dei capitoli importati ai beat del framework selezionato (autowire import→struttura).

### v1.1 — 2026-06-09
- **Decisioni tecniche V1:** app desktop con **Electron + React + TypeScript**; AI in modalità **ibrida** (mock di default, API key opzionale per AI reale); primo traguardo = **MVP must-have completo** costruito in fasi.
- **Nuove epiche:** 21 Import & Interoperabilità, 22 Settings & AI Configuration, 23 Author Voice & Style Profile, 24 Local Search & Snapshots, 25 Onboarding & First-Run.
- **Correzioni:** US-3.9 promossa a principio trasversale (DoD); Epic 17 in V1 solo *usage meter* (no fatturazione); Epic 20 marcata come layer di orchestrazione; chiarito che Character Bible precede Character Arc Engine.

---

## Stato Implementazione

> Legenda: ✅ completata · 🔄 in corso · ⬜ da fare. Nel backlog visuale le voci ✅ sono **barrate**.
> Aggiornato a: **v0.2.0 rilasciata** (installer Windows). 🏁 MVP must-have + 4/5 Should-have completi. Sprint 0 completato (bug import corretti).

- **Completate (✅):** US-1.1, US-1.2, US-1.3, US-1.4, US-1.5, US-2.1, US-2.2, US-2.3, US-2.4, US-2.5, US-2.6, US-2.7, US-3.1, US-3.2, US-3.3, US-3.4, US-3.5, US-3.6, US-3.9, US-4.1, US-4.2, US-4.3, US-4.4, US-4.5, US-5.1, US-5.2, US-5.3, US-5.4, US-5.5, US-6.1, US-6.2, US-6.3, US-6.4, US-6.5, US-9.1, US-9.2, US-9.3, US-9.4, US-10.1, US-10.2, US-10.3, US-10.4, US-10.5, US-16.1, US-16.2, US-16.3, US-17.1, US-17.2, US-18.1, US-21.1, US-21.2, US-21.3, US-21.5, US-21.6, US-21.7, US-22.1, US-22.2, US-22.3, US-22.4, US-22.5, US-23.1, US-23.2, US-23.3, US-7.1, US-7.2, US-7.3, US-8.1, US-8.2, US-8.3, US-8.4, US-24.1, US-24.2, US-24.3, US-25.1, US-25.2, US-25.3, US-30.1, US-30.2, US-30.3, US-30.4
- **In corso (🔄):** Epic 26 Editor Pro + Epic 27 Statistiche (Ondata 1).

> Nota: US-7.4 (cronologie storiche) è in larga parte coperta dal Timeline Engine (eventi con etichette temporali libere); resta aperta come evoluzione dedicata.

---

# Roadmap Strategica

## V1 — Stand-alone MVP

Focus: scrivere, strutturare e revisionare un libro.

- Project & Library Management
- Writing Workspace
- AI Writing Assistant locale/API-ready
- Story Structure Frameworks
- Character Bible
- Character Arc Engine
- World Building
- Timeline Engine
- AI Editor
- Export DOCX/PDF/EPUB
- Sistema crediti simulato/preparato per cloud

## V2 — Online & AI Platform

Focus: account, cloud sync, crediti reali e AI avanzata.

- Login e profili utente
- Piani Free/Creator/Pro
- Crediti AI reali
- Sync cloud
- Versioning
- AI provider multipli
- Reader Simulator
- Marketing Suite
- Social Media Factory

## V3 — Author Operating System

Focus: ecosistema completo per autore.

- Visual AI Studio
- Trailer Generator
- Marketplace plugin
- Collaborazione
- Co-writing
- Publishing assistant avanzato
- Analytics vendite e marketing

---

# Roadmap Top-Tier (v2.0) — «da MVP a strumento di fascia alta»

> Obiettivo: rendere AuthorOS competitivo con Scrivener (organizzazione), Ulysses (esperienza di scrittura), Sudowrite/NovelCrafter (AI che conosce il libro) e Atticus (export professionale) — restando local-first e con l'autore sempre al comando.

## Ondata 1 — «Affidabile come una macchina da scrivere» (V1.5)

La fiducia prima di tutto: dati al sicuro, scrittura senza attriti, numeri che motivano.

- **Sprint 0**: bug import (US-21.6, US-21.7)
- Epic 30 — Affidabilità & Portabilità dati
- Epic 26 — Editor Pro & Flusso di scrittura
- Epic 27 — Statistiche & Obiettivi
- Distribuzione minima: icona app + auto-update (US-32.1, US-32.2)

## Ondata 2 — «L'AI che ha letto il tuo libro» (V1.5)

Il differenziatore: l'AI smette di essere un prompt generico e diventa un editor che conosce personaggi, mondo, struttura e voce.

- Epic 29 — AI Contestuale (streaming, contesto automatico, riscrittura inline, varianti, chat di progetto)
- Epic 20 — Author Copilot (US-20.1…20.4: da idea a mappa completa del libro)
- Epic 28 — Scene Board & Metadati narrativi (corkboard, POV, personaggi/luoghi per scena)

## Ondata 3 — «Dalla bozza al mercato» (V1.5 → V2)

- Epic 31 — Export Professionale (manuscript standard, front matter, EPUB rifinito)
- Epic 14 — Marketing base (sinossi, quarta, pitch)
- Epic 11 — Reader Simulator (anticipata da V2 come differenziatore)
- Distribuzione completa: code signing, i18n inglese, build macOS (US-32.3…32.5)

---

# Backlog per Epiche

---

## EPIC 1 — Project & Library Management

### Obiettivo
Consentire all'autore di creare, gestire e organizzare più progetti libro.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-1.1 | Come autore voglio creare un nuovo progetto libro, così da iniziare a lavorare su una nuova opera. | Must | V1 |
| US-1.2 | Come autore voglio classificare il libro per genere, così che l'app possa suggerire strutture e template adeguati. | Must | V1 |
| US-1.3 | Come autore voglio avere una libreria dei miei progetti, così da passare rapidamente da un libro all'altro. | Must | V1 |
| US-1.4 | Come autore voglio duplicare un progetto, così da creare varianti o versioni alternative. | Should | V1 |
| US-1.5 | Come autore voglio archiviare progetti, così da mantenere ordinata la mia libreria. | Could | V1 |

---

## EPIC 2 — Writing Workspace

### Obiettivo
Fornire un ambiente moderno per scrivere capitoli, scene e note.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-2.1 | Come autore voglio scrivere capitoli e scene, così da costruire il manoscritto. | Must | V1 |
| US-2.2 | Come autore voglio trascinare scene e capitoli, così da modificare facilmente la struttura. | Must | V1 |
| US-2.3 | Come autore voglio lavorare offline, così da scrivere ovunque. | Must | V1 |
| US-2.4 | Come autore voglio usare Markdown, così da avere un formato leggero e portabile. | Must | V1 |
| US-2.5 | Come autore voglio vedere conteggio parole, target e progresso, così da monitorare l'avanzamento. | Must | V1 |
| US-2.6 | Come autore voglio aggiungere note collegate a scene e capitoli, così da mantenere il contesto narrativo. | Should | V1 |
| US-2.7 | Come autore voglio una modalità focus, così da scrivere senza distrazioni. | Should | V1 |

---

## EPIC 3 — AI Writing Assistant

### Obiettivo
Accelerare la scrittura senza togliere all'autore il controllo creativo.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-3.1 | Come autore voglio generare una scena da prompt, così da partire velocemente da un'idea. | Must | V1 |
| US-3.2 | Come autore voglio generare dialoghi, così da sbloccare scene conversazionali. | Must | V1 |
| US-3.3 | Come autore voglio generare descrizioni, così da arricchire luoghi, personaggi e atmosfere. | Must | V1 |
| US-3.4 | Come autore voglio espandere una bozza, così da trasformare appunti in testo narrativo. | Must | V1 |
| US-3.5 | Come autore voglio riscrivere una sezione, così da migliorarne stile e chiarezza. | Must | V1 |
| US-3.6 | Come autore voglio cambiare tono narrativo, così da adattare il testo al genere. | Should | V1 |
| US-3.7 | Come autore voglio generare più varianti, così da scegliere la versione migliore. | Should | V1 |
| US-3.8 | Come autore voglio completare automaticamente una scena, così da superare il blocco dello scrittore. | Should | V1 |
| US-3.9 | Come autore voglio accettare, modificare o rifiutare ogni output AI, così da mantenere controllo manuale. *(Principio trasversale — vedi Definition of Done: implementato dall'"AI Interaction Shell" comune a tutti i moduli AI.)* | Must | V1 |

> **Nota v2.0:** US-3.7 (varianti) e US-3.8 (autocompletamento scena) sono realizzate da **US-29.4** e **US-29.5** dell'Epic 29 — AI Contestuale.

---

## EPIC 4 — Story Structure Frameworks

### Obiettivo
Guidare l'autore con strutture narrative riconosciute.

### Framework iniziali

- Hero's Journey
- Save The Cat Writes a Novel
- Three Act Structure
- Seven Point Story Structure
- Snowflake Method
- Dan Harmon Story Circle

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-4.1 | Come autore voglio scegliere un framework narrativo, così da avere una guida strutturale. | Must | V1 |
| US-4.2 | Come autore voglio visualizzare i beat narrativi, così da capire dove collocare scene e capitoli. | Must | V1 |
| US-4.3 | Come autore voglio associare scene ai beat, così da verificare la copertura strutturale. | Must | V1 |
| US-4.4 | Come autore voglio ricevere suggerimenti sui beat mancanti, così da completare la struttura. | Should | V1 |
| US-4.5 | Come autore voglio generare scene suggerite per ogni beat, così da accelerare la stesura. | Should | V1 |
| US-4.6 | Come autore voglio combinare più framework, così da adattare la struttura al mio libro. | Could | V2 |

### Beat — Hero's Journey

1. Ordinary World
2. Call To Adventure
3. Refusal
4. Mentor
5. Crossing Threshold
6. Tests
7. Ordeal
8. Reward
9. Return

### Beat — Save The Cat Writes a Novel

1. Opening Image
2. Theme Stated
3. Setup
4. Catalyst
5. Debate
6. Break Into Two
7. Fun & Games
8. Midpoint
9. Bad Guys Close In
10. All Is Lost
11. Dark Night of the Soul
12. Break Into Three
13. Finale
14. Final Image

---

## EPIC 5 — Character Arc Engine

### Obiettivo
Costruire e monitorare l'evoluzione dei personaggi.

> **Build order:** la **Character Bible (Epic 6)** precede logicamente il **Character Arc Engine (Epic 5)** — prima i dati anagrafici dei personaggi, poi i loro archi di trasformazione.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-5.1 | Come autore voglio creare un arco di trasformazione del personaggio, così da rendere credibile la sua evoluzione. | Must | V1 |
| US-5.2 | Come autore voglio definire desiderio, bisogno, paura, ferita e menzogna interiore, così da costruire conflitto. | Must | V1 |
| US-5.3 | Come autore voglio collegare l'arco del personaggio ai capitoli, così da monitorare la progressione. | Should | V1 |
| US-5.4 | Come autore voglio ricevere avvisi su trasformazioni incoerenti, così da evitare evoluzioni improvvise. | Should | V1 |
| US-5.5 | Come autore voglio generare conflitti e obiettivi per un personaggio, così da rafforzare la trama. | Should | V1 |

---

## EPIC 6 — Character Bible

### Obiettivo
Centralizzare tutte le informazioni sui personaggi.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-6.1 | Come autore voglio creare schede personaggio, così da mantenere dati coerenti. | Must | V1 |
| US-6.2 | Come autore voglio definire relazioni tra personaggi, così da visualizzare la rete narrativa. | Should | V1 |
| US-6.3 | Come autore voglio tracciare la timeline personale di ogni personaggio, così da evitare incongruenze. | Should | V1 |
| US-6.4 | Come autore voglio che l'AI segnali incoerenze fisiche o biografiche, così da correggerle rapidamente. | Should | V1 |
| US-6.5 | Come autore voglio generare profili completi da una descrizione breve, così da creare cast rapidamente. | Should | V1 |

---

## EPIC 7 — World Building

### Obiettivo
Supportare mondi narrativi complessi, soprattutto fantasy, sci-fi e thriller.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-7.1 | Come autore voglio creare luoghi, così da organizzare ambientazioni. | Must | V1 |
| US-7.2 | Come autore voglio creare organizzazioni, così da gestire poteri, istituzioni e gruppi. | Should | V1 |
| US-7.3 | Come autore voglio creare tecnologie, regole o sistemi, così da rendere coerente il mondo narrativo. | Should | V1 |
| US-7.4 | Come autore voglio creare cronologie storiche, così da dare profondità al mondo. | Could | V1 |
| US-7.5 | Come autore voglio generare mappe concettuali, così da visualizzare connessioni e ambientazioni. | Could | V2 |

---

## EPIC 8 — Plot Intelligence

### Obiettivo
Analizzare la solidità narrativa del libro.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-8.1 | Come autore voglio identificare plot hole, così da correggere problemi logici. | Must | V1 |
| US-8.2 | Come autore voglio identificare scene inutili, così da migliorare ritmo e focus. | Should | V1 |
| US-8.3 | Come autore voglio identificare personaggi inutilizzati, così da valorizzarli o rimuoverli. | Should | V1 |
| US-8.4 | Come autore voglio calcolare il ritmo narrativo, così da capire dove il libro rallenta. | Should | V1 |
| US-8.5 | Come autore voglio analizzare tensione narrativa, così da mantenere alta l'attenzione. | Could | V2 |

---

## EPIC 9 — Timeline Engine

### Obiettivo
Gestire eventi, date, sequenze e coerenza temporale.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-9.1 | Come autore voglio creare una timeline degli eventi, così da organizzare la cronologia della storia. | Must | V1 |
| US-9.2 | Come autore voglio collegare eventi a personaggi e luoghi, così da avere pieno controllo narrativo. | Should | V1 |
| US-9.3 | Come autore voglio ricevere avvisi su inconsistenze temporali, così da evitare errori. | Should | V1 |
| US-9.4 | Come autore voglio una visualizzazione grafica della timeline, così da leggere il libro come sequenza visiva. | Should | V1 |

---

## EPIC 10 — AI Editor

### Obiettivo
Revisionare il testo in modo intelligente e narrativamente utile.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-10.1 | Come autore voglio rilevare ripetizioni, così da migliorare lo stile. | Must | V1 |
| US-10.2 | Come autore voglio rilevare info dump, così da evitare blocchi troppo espositivi. | Must | V1 |
| US-10.3 | Come autore voglio rilevare dialoghi artificiali, così da renderli più credibili. | Should | V1 |
| US-10.4 | Come autore voglio rilevare problemi di pacing, così da migliorare il ritmo. | Should | V1 |
| US-10.5 | Come autore voglio ricevere feedback su show don't tell, così da rendere la scrittura più immersiva. | Should | V1 |

---

## EPIC 11 — Reader Simulator

### Obiettivo
Simulare reazioni di diversi tipi di lettori e professionisti editoriali.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-11.1 | Come autore voglio simulare un lettore thriller, così da capire se il testo genera tensione. | Should | V2 |
| US-11.2 | Come autore voglio simulare un editor, così da ricevere feedback professionale. | Should | V2 |
| US-11.3 | Come autore voglio simulare un agente letterario, così da valutare vendibilità e pitch. | Could | V2 |
| US-11.4 | Come autore voglio simulare un booktoker, così da capire il potenziale social del libro. | Could | V2 |
| US-11.5 | Come autore voglio simulare un recensore Amazon, così da prevedere punti forti e deboli percepiti. | Could | V2 |

---

## EPIC 12 — Visual AI Studio

### Obiettivo
Generare asset visivi coerenti con il libro.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-12.1 | Come autore voglio generare immagini dei personaggi, così da visualizzare il cast. | Could | V2 |
| US-12.2 | Come autore voglio generare ambientazioni, così da visualizzare il mondo narrativo. | Could | V2 |
| US-12.3 | Come autore voglio generare concept art, così da creare materiale promozionale. | Could | V2 |
| US-12.4 | Come autore voglio generare idee copertina, così da esplorare direzioni creative. | Could | V2 |
| US-12.5 | Come autore voglio generare moodboard, così da mantenere coerenza visiva. | Could | V2 |

---

## EPIC 13 — Trailer Generator

### Obiettivo
Aiutare l'autore a creare trailer e teaser video.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-13.1 | Come autore voglio generare storyboard, così da progettare un book trailer. | Could | V2 |
| US-13.2 | Come autore voglio generare prompt per Seedance, così da creare video AI. | Could | V2 |
| US-13.3 | Come autore voglio generare prompt per Veo, così da creare scene video. | Could | V2 |
| US-13.4 | Come autore voglio generare prompt per Runway, così da avere alternative creative. | Could | V2 |
| US-13.5 | Come autore voglio generare teaser social, così da promuovere il libro rapidamente. | Could | V2 |

---

## EPIC 14 — Marketing Suite

### Obiettivo
Trasformare il manoscritto in materiali di vendita e promozione.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-14.1 | Come autore voglio generare una sinossi, così da presentare il libro. | Should | V1 |
| US-14.2 | Come autore voglio generare una quarta di copertina, così da preparare la pubblicazione. | Should | V1 |
| US-14.3 | Come autore voglio generare una scheda stampa, così da contattare giornalisti e biblioteche. | Should | V2 |
| US-14.4 | Come autore voglio generare un pitch, così da spiegare il libro in pochi secondi. | Should | V1 |
| US-14.5 | Come autore voglio generare una query letter, così da contattare agenti o editori. | Could | V2 |

---

## EPIC 15 — Social Media Factory

### Obiettivo
Generare contenuti social partendo dal libro.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-15.1 | Come autore voglio generare caroselli Instagram, così da promuovere personaggi, citazioni e scene. | Could | V2 |
| US-15.2 | Come autore voglio generare script Reel, così da creare video brevi. | Could | V2 |
| US-15.3 | Come autore voglio generare post Instagram, così da comunicare il libro. | Could | V2 |
| US-15.4 | Come autore voglio generare post TikTok, così da intercettare nuovi lettori. | Could | V2 |
| US-15.5 | Come autore voglio generare newsletter, così da costruire relazione con il pubblico. | Could | V2 |

---

## EPIC 16 — Publishing Assistant

### Obiettivo
Preparare il libro per esportazione e pubblicazione.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-16.1 | Come autore voglio esportare in DOCX, così da inviare il manoscritto a editori o editor. | Must | V1 |
| US-16.2 | Come autore voglio esportare in EPUB, così da pubblicare ebook. | Should | V1 |
| US-16.3 | Come autore voglio esportare in PDF, così da stampare o condividere bozze. | Must | V1 |
| US-16.4 | Come autore voglio template KDP, così da preparare la pubblicazione su Amazon. | Could | V2 |
| US-16.5 | Come autore voglio template Bookabook/editori, così da adattare i materiali editoriali. | Could | V2 |

---

## EPIC 17 — AI Credit System

### Obiettivo
Gestire l'uso dell'AI tramite crediti e profili utente.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-17.1 | Come utente voglio vedere i miei crediti AI, così da sapere quanto posso utilizzare l'AI. | Must | V1 |
| US-17.2 | Come sistema voglio assegnare un costo a ogni operazione AI, così da controllare consumi e margini. | Must | V1 |
| US-17.3 | Come utente voglio scegliere un piano, così da avere limiti coerenti con le mie esigenze. | Should | V2 |
| US-17.4 | Come utente voglio acquistare pacchetti crediti, così da continuare a usare l'AI quando necessario. | Should | V2 |
| US-17.5 | Come admin voglio monitorare consumi AI, così da ottimizzare costi e pricing. | Should | V2 |

> **Nota V1:** in V1 il sistema crediti è solo un **usage meter** informativo (conteggio operazioni/token, nessuna fatturazione). Con AI ibrida i costi reali sono a carico dell'utente tramite la propria API key. Crediti reali, acquisti e pricing arrivano in V2 (vedi Epic 22 per la configurazione AI).

### Profili Proposti

| Piano | Prezzo | Crediti | Target |
|---|---:|---:|---|
| Free | 0€ | 100/mese | Prova e piccoli progetti |
| Creator | 9€/mese | 2.000/mese | Autori occasionali |
| Pro Author | 29€/mese | 10.000/mese | Autori attivi |
| Studio | 99€/mese | 50.000/mese | Team/editori |
| Unlimited | Custom | Fair Use | Power user |

---

## EPIC 18 — Plugin Architecture

### Obiettivo
Rendere l'app aperta a nuove feature ed evoluzioni.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-18.1 | Come sistema voglio una struttura modulare, così da aggiungere nuove feature senza riscrivere l'app. | Must | V1 |
| US-18.2 | Come admin voglio abilitare/disabilitare moduli, così da gestire release progressive. | Should | V2 |
| US-18.3 | Come sistema voglio supportare provider AI multipli, così da non dipendere da un solo modello. | Should | V2 |
| US-18.4 | Come utente voglio installare plugin o template, così da personalizzare il mio workflow. | Could | V3 |
| US-18.5 | Come sviluppatore voglio creare plugin, così da estendere l'ecosistema. | Could | V3 |

### AI Provider Futuri

- OpenAI
- Anthropic
- Gemini
- Mistral
- Local LLM
- Provider immagini
- Provider video

---

## EPIC 19 — Cloud Platform

### Obiettivo
Portare l'app online con sync, account e collaborazione.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-19.1 | Come utente voglio sincronizzare i progetti in cloud, così da lavorare da più dispositivi. | Should | V2 |
| US-19.2 | Come utente voglio backup automatici, così da non perdere il lavoro. | Should | V2 |
| US-19.3 | Come autore voglio invitare collaboratori, così da lavorare con editor o co-autori. | Could | V3 |
| US-19.4 | Come autore voglio versioning, così da recuperare versioni precedenti. | Should | V2 |
| US-19.5 | Come autore voglio commenti e suggerimenti, così da collaborare sul testo. | Could | V3 |

---

## EPIC 20 — Author Copilot

### Obiettivo
Creare una modalità guidata che accompagni l'autore dall'idea alla bozza completa.

> **Nota architetturale:** Author Copilot è un **layer di orchestrazione** che compone le funzioni di Epic 3 (AI Assistant), 4 (Story Structure), 5/6 (Personaggi) e 23 (Author Voice). Va sviluppato **dopo** che quei moduli base esistono.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-20.1 | Come autore voglio descrivere l'idea del libro in poche righe, così da generare una struttura iniziale. | Must | V1 |
| US-20.2 | Come autore voglio generare outline capitolo per capitolo, così da partire rapidamente. | Must | V1 |
| US-20.3 | Come autore voglio generare personaggi coerenti con la trama, così da creare una base narrativa completa. | Should | V1 |
| US-20.4 | Come autore voglio generare beat, scene e archi dei personaggi, così da creare una mappa completa del libro. | Should | V1 |
| US-20.5 | Come autore voglio passare da idea a prima bozza assistita, così da scrivere molto più velocemente. | Should | V2 |

---

## EPIC 21 — Import & Interoperabilità

### Obiettivo
Permettere all'autore di portare in AuthorOS manoscritti e materiali esistenti.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-21.1 | Come autore voglio importare un manoscritto DOCX, così da continuare un lavoro già iniziato. | Must | V1 |
| US-21.2 | Come autore voglio importare file Markdown/TXT, così da riusare bozze e appunti. | Must | V1 |
| US-21.3 | Come autore voglio che l'import riconosca capitoli e scene, così da ottenere subito una struttura navigabile. | Should | V1 |
| US-21.4 | Come autore voglio importare schede personaggi/note da CSV o testo, così da popolare rapidamente la Character Bible. | Could | V2 |
| US-21.5 | Come autore voglio che i capitoli importati vengano associati automaticamente ai beat del framework selezionato, così da avere subito la mappa strutturale del manoscritto. | Should | V1 |
| US-21.6 | Come autore voglio che l'import non crei capitoli fittizi o duplicati: il testo prima del primo capitolo diventa "Premessa" e i capitoli segnaposto vuoti preesistenti vengono rimossi. *(bug dal collaudo)* | Must | V1 |
| US-21.7 | Come autore voglio che le scene senza titolo importate siano numerate "Scena x.y" (x = capitolo, y = progressivo), così da orientarmi subito nel manoscritto. *(bug dal collaudo)* | Must | V1 |

---

## EPIC 22 — Settings & AI Configuration

### Obiettivo
Configurare app e AI in modo sicuro e trasparente (abilita la modalità AI ibrida).

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-22.1 | Come utente voglio inserire la mia API key AI in modo sicuro (cifrata nel keychain OS), così da attivare l'AI reale. | Must | V1 |
| US-22.2 | Come utente voglio scegliere provider e modello AI, così da controllare qualità e costi. | Must | V1 |
| US-22.3 | Come utente voglio passare tra modalità mock e AI reale, così da provare l'app senza costi. | Must | V1 |
| US-22.4 | Come utente voglio impostare la lingua dell'interfaccia, così da usare l'app nella mia lingua. | Should | V1 |
| US-22.5 | Come utente voglio vedere e controllare quali dati vengono inviati all'AI, così da tutelare la mia proprietà intellettuale. | Must | V1 |

---

## EPIC 23 — Author Voice & Style Profile

### Obiettivo
Preservare la voce dell'autore in ogni output AI — il cuore della promessa *"senza perdere la tua voce"*.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-23.1 | Come autore voglio creare un profilo di stile (tono, registro, esempi), così da guidare l'AI a scrivere come me. | Must | V1 |
| US-23.2 | Come autore voglio generare un profilo di stile da un mio testo campione, così da configurarlo rapidamente. | Should | V1 |
| US-23.3 | Come autore voglio applicare il profilo a tutte le generazioni AI, così da mantenere coerenza stilistica. | Must | V1 |
| US-23.4 | Come autore voglio profili di stile diversi per progetto/personaggio, così da gestire voci multiple. | Should | V2 |

---

## EPIC 24 — Local Search & Snapshots

### Obiettivo
Ritrovare contenuti e proteggere il lavoro localmente (versioning locale, precursore del versioning cloud V2).

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-24.1 | Come autore voglio cercare full-text in tutto il progetto, così da ritrovare scene, personaggi e note. | Should | V1 |
| US-24.2 | Come autore voglio creare snapshot manuali del progetto, così da poter tornare a una versione precedente. | Should | V1 |
| US-24.3 | Come autore voglio snapshot automatici periodici, così da non perdere lavoro. | Should | V1 |
| US-24.4 | Come autore voglio confrontare due versioni di una scena, così da valutare le modifiche. | Could | V2 |

---

## EPIC 25 — Onboarding & First-Run

### Obiettivo
Accompagnare l'utente al primo avvio ed evitare il foglio bianco.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-25.1 | Come nuovo utente voglio un onboarding guidato, così da capire subito cosa posso fare. | Should | V1 |
| US-25.2 | Come nuovo utente voglio creare il primo progetto da un template di genere, così da partire senza foglio bianco. | Should | V1 |
| US-25.3 | Come nuovo utente voglio un progetto demo precaricato, così da esplorare le funzioni. | Could | V1 |

---

## EPIC 26 — Editor Pro & Flusso di scrittura

### Obiettivo
Portare l'esperienza di scrittura al livello di Ulysses/Scrivener: zero attriti, pieno controllo.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-26.1 | Come autore voglio cercare e sostituire testo nella scena e in tutto il progetto, così da fare revisioni rapide. | Must | V1.5 |
| US-26.2 | Come autore voglio assegnare uno stato a ogni scena (bozza, revisione, finale) visibile nell'albero, così da sapere dove sono. | Must | V1.5 |
| US-26.3 | Come autore voglio la typewriter mode (riga corrente sempre centrata) nel focus, così da scrivere senza distrazioni. | Should | V1.5 |
| US-26.4 | Come autore voglio sprint di scrittura con timer e conteggio parole di sessione, così da mantenere il ritmo. | Should | V1.5 |
| US-26.5 | Come autore voglio annotazioni inline non stampabili nel testo, così da lasciarmi promemoria senza sporcare il manoscritto. | Should | V1.5 |
| US-26.6 | Come autore voglio scegliere font, dimensione, larghezza colonna e tema chiaro/scuro dell'editor, così da scrivere comodo. | Should | V1.5 |
| US-26.7 | Come autore voglio una command palette (Ctrl+K) per navigare e agire da tastiera, così da non staccare le mani. | Could | V1.5 |

---

## EPIC 27 — Statistiche & Obiettivi di scrittura

### Obiettivo
Trasformare la costanza in un gioco: numeri chiari, obiettivi, momentum.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-27.1 | Come autore voglio lo storico delle parole scritte per giorno, così da vedere la mia costanza. | Must | V1.5 |
| US-27.2 | Come autore voglio un obiettivo giornaliero con streak, così da mantenere l'abitudine. | Should | V1.5 |
| US-27.3 | Come autore voglio una deadline di progetto con proiezione del ritmo necessario, così da sapere se sono in tabella. | Should | V1.5 |
| US-27.4 | Come autore voglio una dashboard progressi con grafici (giorni, capitoli, sessioni), così da avere il quadro. | Should | V1.5 |

---

## EPIC 28 — Scene Board & Metadati narrativi

### Obiettivo
Dare a ogni scena identità e collegamenti reali: il manoscritto diventa navigabile come una mappa.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-28.1 | Come autore voglio metadati per scena — POV, luogo (dal Mondo) e personaggi presenti (dalla Bible) — così da collegare davvero manoscritto e codex. | Must | V1.5 |
| US-28.2 | Come autore voglio una corkboard a schede con sinossi e drag&drop, così da ristrutturare il libro a colpo d'occhio. | Should | V1.5 |
| US-28.3 | Come autore voglio una outline view compatta (scene + metadati + stati), così da rivedere la struttura senza aprire le scene. | Should | V1.5 |
| US-28.4 | Come autore voglio filtrare il manoscritto per personaggio, luogo o stato, così da lavorare per filoni. | Should | V1.5 |
| US-28.5 | Come sistema voglio che Plot Intelligence usi i metadati (personaggi presenti reali, non match testuale), così da dare segnalazioni precise. | Should | V1.5 |

---

## EPIC 29 — AI Contestuale

### Obiettivo
L'AI che ha letto il tuo libro: ogni generazione conosce scena, personaggi, mondo, struttura e voce. Il differenziatore di fascia alta.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-29.1 | Come autore voglio che l'AI riceva automaticamente il contesto (scena corrente, schede dei personaggi citati, luogo, beat), così da ottenere testo coerente col libro. | Must | V1.5 |
| US-29.2 | Come autore voglio vedere l'output AI in streaming, così da valutarlo mentre nasce e interromperlo. | Must | V1.5 |
| US-29.3 | Come autore voglio selezionare un passaggio nell'editor e chiederne la riscrittura lì (con anteprima accetta/rifiuta), così da revisionare senza copia-incolla. | Must | V1.5 |
| US-29.4 | Come autore voglio generare 2–3 varianti confrontabili fianco a fianco, così da scegliere la migliore. *(realizza US-3.7)* | Should | V1.5 |
| US-29.5 | Come autore voglio "continua a scrivere" dal punto del cursore, così da superare il blocco. *(realizza US-3.8)* | Should | V1.5 |
| US-29.6 | Come autore voglio una chat laterale che conosce il progetto, così da ragionare sul libro senza uscire dall'app. | Should | V1.5 |
| US-29.7 | Come autore voglio la stima del costo prima di ogni chiamata e un tetto di spesa mensile, così da usare l'AI senza sorprese. | Should | V1.5 |

---

## EPIC 30 — Affidabilità & Portabilità dati

### Obiettivo
Il manoscritto è sacro: mai perso, mai prigioniero dell'app.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-30.1 | Come autore voglio backup automatici in una cartella a mia scelta (anche Dropbox/Drive/OneDrive), così da avere copie fuori dal computer. | Must | V1.5 |
| US-30.2 | Come autore voglio esportare/importare l'intero progetto come singolo file (.authoros), così da spostarlo o condividerlo. | Must | V1.5 |
| US-30.3 | Come sistema voglio migrazioni di schema versionate, così che gli aggiornamenti dell'app non tocchino mai i dati esistenti. | Must | V1.5 |
| US-30.4 | Come autore voglio il recupero della bozza non salvata dopo un crash, così da non perdere neanche un paragrafo. | Should | V1.5 |

---

## EPIC 31 — Export Professionale

### Obiettivo
Da bozza a documento da inviare o pubblicare, senza passare da altri tool (benchmark: Atticus).

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-31.1 | Come autore voglio l'export DOCX in formato manoscritto standard (Shunn: doppia interlinea, rientri, intestazioni), così da inviarlo ad agenti ed editor. | Must | V1.5 |
| US-31.2 | Come autore voglio front matter configurabile (frontespizio, copyright, dedica), così da avere un libro completo. | Should | V1.5 |
| US-31.3 | Come autore voglio EPUB con copertina e indice rifinito, così da pubblicare direttamente. | Should | V1.5 |
| US-31.4 | Come autore voglio esportare solo capitoli selezionati, così da condividere estratti. | Should | V1.5 |
| US-31.5 | Come autore voglio impostazioni di impaginazione PDF (formato, margini, font), così da controllare la stampa. | Could | V1.5 |

---

## EPIC 32 — Distribuzione & Fiducia

### Obiettivo
Un'app che si installa, si aggiorna e si presenta come un prodotto professionale.

### User Stories

| ID | User Story | Priorità | Release |
|---|---|---:|---|
| US-32.1 | Come utente voglio un'icona e un'identità visiva dell'app, così da riconoscerla come prodotto curato. | Must | V1.5 |
| US-32.2 | Come utente voglio aggiornamenti automatici (GitHub Releases), così da avere sempre l'ultima versione. | Must | V1.5 |
| US-32.3 | Come utente voglio un installer firmato senza avvisi SmartScreen, così da fidarmi dell'installazione. | Should | V1.5 |
| US-32.4 | Come utente voglio l'interfaccia anche in inglese, così da aprire il prodotto al mercato internazionale. | Should | V1.5 |
| US-32.5 | Come utente voglio la versione macOS, così da scrivere sul mio Mac. | Could | V2 |

---

# MVP V1 Consigliato

## Must Have

1. Project & Library Management
2. Writing Workspace
3. Settings & AI Configuration
4. AI Writing Assistant
5. Author Voice & Style Profile
6. Story Structure Frameworks
7. Character Bible
8. Character Arc Engine
9. Timeline Engine
10. AI Editor base
11. Import manoscritto (DOCX/Markdown)
12. Export DOCX/PDF
13. Usage meter AI (crediti preparatori)
14. Architettura modulare

## Should Have

1. World Building
2. Plot Intelligence base
3. Marketing base: sinossi, pitch, quarta
4. EPUB export
5. Author Copilot iniziale
6. Local Search & Snapshots
7. Onboarding & First-Run

## Could Have

1. Visual AI Studio
2. Trailer Generator
3. Social Media Factory
4. Reader Simulator
5. Cloud sync

---

# Definition of Done V1

Una user story è completata quando:

- La funzionalità è disponibile da UI.
- I dati sono salvati localmente.
- L'utente può modificare manualmente ogni output AI.
- L'output AI non sovrascrive mai automaticamente il testo.
- La feature funziona offline quando non richiede AI.
- Gli errori sono gestiti con messaggi chiari.
- La struttura dati è compatibile con una futura versione cloud.
- La feature è documentata con almeno un esempio d'uso.

---

# Principio Finale

AuthorOS deve essere percepita come:

> Scrivener + Sudowrite + NovelCrafter + Canva per autori + Marketing assistant.

Ma con una promessa più chiara:

> **Scrivi il tuo libro più velocemente. Senza perdere la tua voce.**
