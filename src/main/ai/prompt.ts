import type { AIRequest, AssistKind } from '@shared/ai'

export interface Composed {
  system: string
  user: string
  maxTokens: number
}

const OPERATION_INSTRUCTION: Record<AIRequest['operation'], string> = {
  scene: 'Scrivi una scena narrativa basata sulla richiesta.',
  dialogue: 'Scrivi un dialogo credibile basato sulla richiesta.',
  description: 'Scrivi una descrizione vivida (luogo, personaggio o atmosfera).',
  expand: 'Espandi gli appunti forniti in prosa narrativa.',
  rewrite: 'Riscrivi il testo migliorandone stile e chiarezza, mantenendo il significato.',
  tone: 'Riscrivi il testo adattandone il tono come richiesto.',
  continue:
    'Continua la scena esattamente dal punto in cui il testo si interrompe, mantenendo tono, tempo verbale e punto di vista. Non riassumere e non ripetere il testo esistente.'
}

const BASE_SYSTEM =
  "Sei un assistente di scrittura per autori. L'autore mantiene sempre il controllo creativo. " +
  'Rispondi in italiano con SOLO il testo richiesto, senza meta-commento, preamboli o spiegazioni. ' +
  "Rispetta fedelmente la voce e lo stile dell'autore quando forniti."

/** Compone system+user per una generazione AI, includendo il profilo di stile (Epic 23). */
export function composeGeneration(req: AIRequest): Composed {
  let system = BASE_SYSTEM + '\n\nCompito: ' + OPERATION_INSTRUCTION[req.operation]
  if (req.styleProfile && req.styleProfile.trim()) {
    system += `\n\nVoce dell'autore da rispettare:\n${req.styleProfile.trim()}`
  }
  let user = req.prompt.trim()
  if (req.context && req.context.trim()) {
    user += `\n\nContesto della scena:\n${req.context.trim()}`
  }
  return { system, user, maxTokens: 4096 }
}

/** Compone i prompt per le operazioni ausiliarie sui personaggi (Epic 5/6). */
export function composeAssist(kind: AssistKind, payload: string): Composed {
  switch (kind) {
    case 'character-profile':
      return {
        system:
          'Sei un editor che aiuta a costruire personaggi. Dalla descrizione breve fornita genera ' +
          'una scheda personaggio in italiano con queste sezioni, una per riga, nel formato "Etichetta: testo": ' +
          'Nome, Ruolo, Sintesi, Aspetto, Tratti. Niente preamboli né altro testo.',
        user: payload.trim(),
        maxTokens: 1024
      }
    case 'character-conflicts':
      return {
        system:
          'Sei un editor narrativo. Dalla scheda personaggio fornita proponi in italiano 3 conflitti ' +
          '(interiori o esterni) e 3 obiettivi concreti che rafforzino la trama. Elenco puntato, conciso, niente preamboli.',
        user: payload.trim(),
        maxTokens: 1024
      }
    case 'coherence-check':
      return {
        system:
          'Sei un editor attento alla coerenza. Analizza la scheda e l’arco del personaggio forniti e segnala ' +
          'in italiano eventuali incoerenze (fisiche, biografiche, psicologiche o di trasformazione) come elenco puntato. ' +
          'Se non trovi incoerenze, scrivi solo: "Nessuna incoerenza rilevata." Niente preamboli.',
        user: payload.trim(),
        maxTokens: 1024
      }
    case 'editor-info-dump':
      return {
        system:
          EDITOR_BASE +
          'Individua i blocchi espositivi (info dump): passaggi che riversano informazioni invece di drammatizzarle. ' +
          'Per ciascuno: cita le prime parole del passaggio, spiega in una riga il problema e proponi come scioglierlo nella scena. ' +
          'Se il testo è pulito, scrivi solo: "Nessun info dump rilevato."',
        user: payload.trim(),
        maxTokens: 1500
      }
    case 'editor-dialogue':
      return {
        system:
          EDITOR_BASE +
          'Individua i dialoghi artificiali: battute espositive, troppo formali, prive di sottotesto o tutte uguali tra ' +
          'personaggi diversi. Per ciascuna: citala, spiega in una riga perché suona finta e proponi una versione più credibile. ' +
          'Se i dialoghi funzionano, scrivi solo: "I dialoghi suonano naturali."',
        user: payload.trim(),
        maxTokens: 1500
      }
    case 'editor-show-dont-tell':
      return {
        system:
          EDITOR_BASE +
          'Individua i passaggi in cui le emozioni o i giudizi sono dichiarati invece che mostrati (tell). ' +
          'Per ciascuno: citalo e proponi come mostrarlo con azioni, sensazioni o dettagli concreti (show). ' +
          'Se il testo mostra già bene, scrivi solo: "Il testo mostra più che raccontare."',
        user: payload.trim(),
        maxTokens: 1500
      }
    case 'editor-pacing':
      return {
        system:
          EDITOR_BASE +
          'Valuta il ritmo narrativo: segnala dove il testo rallenta (descrizioni o riflessioni troppo lunghe) e dove corre ' +
          'troppo (eventi importanti liquidati in poche righe). Indica i punti citando le prime parole e proponi un aggiustamento. ' +
          'Chiudi con un giudizio sintetico di una riga sul ritmo complessivo.',
        user: payload.trim(),
        maxTokens: 1500
      }
    case 'plot-holes':
      return {
        system:
          'Sei un editor strutturale esperto. Analizza il manoscritto fornito (capitoli marcati con # e scene con ##) ' +
          'e individua i plot hole: contraddizioni logiche, fili narrativi aperti e mai chiusi, motivazioni mancanti, ' +
          'oggetti o informazioni che compaiono dal nulla, eventi impossibili rispetto a quanto stabilito prima. ' +
          'Rispondi in italiano con un elenco numerato: per ogni problema indica dove si manifesta (capitolo/scena), ' +
          'perché è un buco e una proposta di soluzione in una riga. ' +
          'Se la trama regge, scrivi solo: "Nessun plot hole rilevante individuato." Niente preamboli.',
        user: payload.trim(),
        maxTokens: 2000
      }
    case 'copilot-blueprint':
      return {
        system:
          '[FORMATO-BLUEPRINT] Sei un architetto di storie. Dall\'idea fornita progetta la mappa di un romanzo. ' +
          'Rispondi in italiano ESATTAMENTE in questo formato, senza altro testo:\n' +
          'TITOLO: titolo proposto\n' +
          'GENERE: genere\n' +
          'LOGLINE: la storia in una frase\n' +
          `FRAMEWORK: il più adatto tra ${'"' + ['Hero\'s Journey', 'Save The Cat Writes a Novel', 'Three Act Structure', 'Seven Point Story Structure', 'Snowflake Method', 'Dan Harmon Story Circle'].join('", "') + '"'}\n` +
          'CAPITOLI:\n' +
          '1. Titolo capitolo — cosa succede, in una riga\n' +
          '(da 8 a 20 capitoli numerati)\n' +
          'PERSONAGGI:\n' +
          '- Nome | Ruolo | Sintesi in una riga\n' +
          '(da 3 a 8 personaggi)',
        user: payload.trim(),
        maxTokens: 3000
      }
    case 'copilot-arc':
      return {
        system:
          '[FORMATO-ARCO] Sei un editor di personaggi. Dalla scheda fornita progetta l\'arco di trasformazione. ' +
          'Rispondi in italiano ESATTAMENTE con queste sei righe, senza altro testo:\n' +
          'DESIDERIO: cosa vuole consapevolmente\n' +
          'BISOGNO: cosa gli serve davvero\n' +
          'PAURA: la paura che lo frena\n' +
          'FERITA: l\'evento passato che lo ha segnato\n' +
          'BUGIA: la convinzione sbagliata su di sé o sul mondo\n' +
          'TRASFORMAZIONE: come cambia alla fine',
        user: payload.trim(),
        maxTokens: 800
      }
    case 'plot-scene-audit':
      return {
        system:
          'Sei un editor strutturale. Per ogni scena del manoscritto fornito (capitoli # e scene ##) valuta se fa ' +
          'avanzare la trama, sviluppa un personaggio o costruisce il mondo. Rispondi in italiano elencando SOLO le ' +
          'scene deboli: per ciascuna indica capitolo/scena, cosa non sta facendo e se conviene tagliarla, fonderla o ' +
          'rafforzarla (con come). Se tutte le scene lavorano, scrivi solo: "Tutte le scene hanno una funzione." ' +
          'Niente preamboli.',
        user: payload.trim(),
        maxTokens: 2000
      }
    // --- Marketing (Epic 14) -----------------------------------------------
    case 'marketing-synopsis':
      return {
        system:
          MARKETING_BASE +
          'Scrivi una SINOSSI editoriale di 300-500 parole: presenta protagonista, conflitto, posta in gioco ' +
          'e arco completo della storia INCLUSO il finale (le sinossi per editor rivelano il finale). ' +
          'Tono professionale, terza persona, tempo presente.',
        user: payload.trim(),
        maxTokens: 1500
      }
    case 'marketing-blurb':
      return {
        system:
          MARKETING_BASE +
          'Scrivi una QUARTA DI COPERTINA di 100-150 parole: aggancio emotivo, protagonista, conflitto e domanda ' +
          'che resta aperta. NON rivelare il finale. Chiudi con una frase a effetto. Tono da libreria, seconda o terza persona.',
        user: payload.trim(),
        maxTokens: 800
      }
    case 'marketing-pitch':
      return {
        system:
          MARKETING_BASE +
          'Scrivi 3 PITCH alternativi: 1) elevator pitch di una frase (max 30 parole); 2) pitch "X incontra Y" ' +
          'con due opere note come riferimento; 3) pitch di 2-3 frasi per un post social. Numerali 1-3.',
        user: payload.trim(),
        maxTokens: 800
      }
    // --- Reader Simulator (Epic 11) ------------------------------------------
    case 'reader-genre':
      return {
        system:
          READER_BASE +
          'Sei un LETTORE FORTE del genere di questo libro. Leggi l\'estratto come farebbe un appassionato: ' +
          'dove ti sei annoiato? Dove volevi girare pagina? Il gancio funziona? I tropi del genere sono rispettati o traditi bene? ' +
          'Dai un voto da 1 a 10 alla voglia di continuare a leggere e spiega perché.',
        user: payload.trim(),
        maxTokens: 1500
      }
    case 'reader-editor':
      return {
        system:
          READER_BASE +
          'Sei un EDITOR PROFESSIONISTA di una casa editrice. Valuta l\'estratto come un manoscritto in acquisizione: ' +
          'qualità della prosa, voce, struttura, originalità, problemi ricorrenti. Chiudi con: cosa sistemerei prima di pubblicare (3 punti) ' +
          'e un giudizio onesto in una riga.',
        user: payload.trim(),
        maxTokens: 1500
      }
    case 'reader-agent':
      return {
        system:
          READER_BASE +
          'Sei un AGENTE LETTERARIO. Valuta VENDIBILITÀ e posizionamento: a che scaffale appartiene, comparabili recenti, ' +
          'punti di forza commerciali, ostacoli alla vendita, a quali editori lo proporresti. Chiudi con: "Lo rappresenterei: sì/no/forse" e perché.',
        user: payload.trim(),
        maxTokens: 1500
      }
    case 'reader-booktoker':
      return {
        system:
          READER_BASE +
          'Sei un BOOKTOKER con un pubblico giovane. Reagisci all\'estratto: quali momenti diventerebbero virali, ' +
          'quali hashtag useresti, che hook diresti nei primi 3 secondi del video. Se non funzionerebbe su BookTok, dillo chiaramente e spiega cosa manca.',
        user: payload.trim(),
        maxTokens: 1200
      }
    case 'reader-reviewer':
      return {
        system:
          READER_BASE +
          'Sei un RECENSORE AMAZON esigente ma corretto. Scrivi la recensione che pubblicheresti: titolo della recensione, ' +
          'stelle (1-5), cosa ti è piaciuto, cosa no, a chi lo consiglieresti. Realistico, come una vera recensione.',
        user: payload.trim(),
        maxTokens: 1200
      }
  }
}

const MARKETING_BASE =
  'Sei un copywriter editoriale esperto. Ti viene fornita la panoramica di un romanzo (trama, capitoli, personaggi). ' +
  'Rispondi in italiano, SOLO con il testo richiesto, senza preamboli né spiegazioni. '

const READER_BASE =
  'Ti viene fornito un estratto di manoscritto con una breve panoramica. Rispondi in italiano, in prima persona, ' +
  'restando nel personaggio richiesto. Sii onesto: un feedback tutto positivo non aiuta l\'autore. Niente preamboli. '

const EDITOR_BASE =
  'Sei un editor narrativo esperto. Analizza il testo fornito e rispondi in italiano con un elenco puntato conciso. ' +
  "Non riscrivere l'intero testo e non aggiungere preamboli. "

/** Chat di progetto (US-29.6): l'assistente conosce la panoramica del libro. */
export function composeChat(
  overview: string,
  history: { role: 'user' | 'assistant'; text: string }[]
): Composed {
  const transcript = history
    .map((m) => `${m.role === 'user' ? 'AUTORE' : 'ASSISTENTE'}: ${m.text}`)
    .join('\n\n')
  return {
    system:
      "Sei l'assistente editoriale personale dell'autore dentro AuthorOS. Conosci il progetto qui sotto. " +
      'Rispondi in italiano, in modo concreto e conciso; quando utile cita capitoli, scene o personaggi per nome. ' +
      "Non inventare contenuti del libro che non conosci: se un'informazione non è nel contesto, dillo.\n\n" +
      `PROGETTO:\n${overview}`,
    user: transcript || 'Ciao!',
    maxTokens: 1500
  }
}

/** Compone il prompt per derivare un profilo di stile da un testo campione (US-23.2). */
export function composeStyleDerivation(sample: string): Composed {
  return {
    system:
      "Sei un analista di stile letterario. Analizza il brano fornito e descrivi la voce dell'autore " +
      '(tono, registro, ritmo, persona narrativa, lessico, uso del dialogo). ' +
      "Rispondi in italiano con istruzioni concise e operative utilizzabili per far scrivere un'AI nello stesso stile. " +
      'Niente preamboli.',
    user: `Brano campione:\n${sample.trim()}`,
    maxTokens: 1024
  }
}
