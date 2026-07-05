#!/usr/bin/env node
/**
 * Generatore del Visual Backlog di AuthorOS.
 *
 * Legge AuthorOS_Backlog.md e produce AuthorOS_Visual_Backlog.html mantenendo
 * il tema dark del progetto. Va rilanciato dopo ogni modifica al backlog:
 *
 *   node scripts/generate-backlog-html.mjs
 *   (oppure: npm run backlog:html)
 *
 * Output:
 *  - una griglia "Epiche a colpo d'occhio" (parsing di ## EPIC N, Obiettivo, priorità, release)
 *  - il backlog completo renderizzato dal markdown (heading, liste, tabelle, citazioni)
 * Così l'HTML resta sempre 1:1 con la fonte di verità (.md). Nessuna dipendenza esterna.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'AuthorOS_Backlog.md');
const OUT = join(ROOT, 'AuthorOS_Visual_Backlog.html');

const md = readFileSync(SRC, 'utf8');

/* ---------------------------- helpers inline ----------------------------- */

const escapeHtml = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

const inline = (raw) => {
  let s = escapeHtml(raw);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
};

/* ----------------------------- stato (status) ----------------------------- */

const STATUS_ICON = { done: '✅', wip: '🔄', todo: '⬜' };

// Legge la sezione "Stato Implementazione": ID nelle righe "Completate" -> done,
// nelle righe "In corso" -> wip. Tutto il resto resta "todo" (default).
function parseStatus(text) {
  const us = new Map();
  for (const line of text.split(/\r?\n/)) {
    const ids = [...line.matchAll(/US-[\d.]+/g)].map((m) => m[0]);
    if (!ids.length) continue;
    if (/Completate/i.test(line)) ids.forEach((id) => us.set(id, 'done'));
    else if (/In corso/i.test(line)) ids.forEach((id) => us.set(id, 'wip'));
  }
  return us;
}

const STATUS = parseStatus(md);

/* ----------------------- markdown -> HTML (subset) ------------------------ */

function renderMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let i = 0;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    }
  };

  const isTableSep = (row) =>
    row
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length)
      .every((c) => /^:?-{2,}:?$/.test(c));

  const splitRow = (row) => {
    let r = row.trim();
    if (r.startsWith('|')) r = r.slice(1);
    if (r.endsWith('|')) r = r.slice(0, -1);
    return r.split('|').map((c) => c.trim());
  };

  while (i < lines.length) {
    const line = lines[i];

    // blank
    if (!line.trim()) {
      flushPara();
      i++;
      continue;
    }

    // horizontal rule
    if (/^---+\s*$/.test(line)) {
      flushPara();
      out.push('<hr />');
      i++;
      continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      const lvl = h[1].length;
      const em = h[2].match(/^EPIC\s+(\d+)/);
      const st = em ? EPIC_STATUS.get(em[1]) : null;
      const titleHtml = st && st.state === 'done' ? `<del>${inline(h[2])}</del>` : inline(h[2]);
      const badge = st
        ? ` <span class="badge ${st.state}">${STATUS_ICON[st.state]} ${st.done}/${st.total}</span>`
        : '';
      out.push(`<h${lvl}>${titleHtml}${badge}</h${lvl}>`);
      i++;
      continue;
    }

    // blockquote (possibly multi-line)
    if (/^>\s?/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    // table
    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara();
      const header = splitRow(lines[i]);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const thead = `<thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map((r) => {
          const m = (r[0] || '').match(/^(US-[\d.]+)/);
          const st = m ? STATUS.get(m[1]) || 'todo' : null;
          const cls = st ? ` class="row-${st}"` : '';
          const icon = st ? `${STATUS_ICON[st]} ` : '';
          return `<tr${cls}>${r
            .map((c, ci) => `<td>${ci === 0 && st ? icon : ''}${inline(c)}</td>`)
            .join('')}</tr>`;
        })
        .join('')}</tbody>`;
      out.push(`<div class="table-wrap"><table>${thead}${tbody}</table></div>`);
      continue;
    }

    // unordered list
    if (/^\s*-\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*-\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // paragraph text
    para.push(line.trim());
    i++;
  }
  flushPara();
  return out.join('\n');
}

/* ------------------------ parsing epiche per cards ------------------------ */

const PRIO_RANK = { Must: 3, Should: 2, Could: 1 };
const PRIO_CLASS = { 3: 'must', 2: 'should', 1: 'could' };
const PRIO_LABEL = { 3: 'Must', 2: 'Should', 1: 'Could' };

function parseEpics(text) {
  const epics = [];
  const re = /^##\s+EPIC\s+(\d+)\s+—\s+(.+)$/gm;
  const matches = [...text.matchAll(re)];
  for (let k = 0; k < matches.length; k++) {
    const m = matches[k];
    const start = m.index + m[0].length;
    const end = k + 1 < matches.length ? matches[k + 1].index : text.length;
    const body = text.slice(start, end);

    const num = m[1];
    const name = m[2].trim();

    const objMatch = body.match(/###\s+Obiettivo\s*\n+([^\n]+)/);
    const objective = objMatch ? objMatch[1].trim() : '';

    const usRe = /^\|\s*(US-[\d.]+)\s*\|(.+?)\|\s*(Must|Should|Could)\s*\|\s*(V[\d.]+)\s*\|/gm;
    const stories = [];
    let topPrio = 1;
    const releases = new Set();
    let u;
    while ((u = usRe.exec(body)) !== null) {
      const prio = u[3];
      const rel = u[4];
      stories.push({ id: u[1].trim(), prio, rel });
      topPrio = Math.max(topPrio, PRIO_RANK[prio]);
      releases.add(rel);
    }
    const rels = [...releases].sort();
    const relLabel = rels.length ? (rels.length === 1 ? rels[0] : `${rels[0]}/${rels[rels.length - 1]}`) : '—';

    epics.push({
      num,
      name,
      objective,
      count: stories.length,
      topPrio,
      relLabel,
      storyIds: stories.map((s) => s.id)
    });
  }
  return epics;
}

const epics = parseEpics(md);

// Stato per epica: aggregato dallo stato delle sue US.
const EPIC_STATUS = new Map();
for (const e of epics) {
  const total = e.storyIds.length;
  const done = e.storyIds.filter((id) => STATUS.get(id) === 'done').length;
  const wip = e.storyIds.filter((id) => STATUS.get(id) === 'wip').length;
  const state = total > 0 && done === total ? 'done' : done > 0 || wip > 0 ? 'wip' : 'todo';
  EPIC_STATUS.set(e.num, { done, total, wip, state });
}

const epicCards = epics
  .map((e) => {
    const st = EPIC_STATUS.get(e.num);
    const name = st.state === 'done' ? `<del>${inline(e.name)}</del>` : inline(e.name);
    return `      <article class="card ${PRIO_CLASS[e.topPrio]} epic-${st.state}">
        <div class="card-top"><span>EPIC ${e.num}</span><span class="pill">${e.relLabel}</span></div>
        <h3>${name}</h3>
        <p>${inline(e.objective)}</p>
        <div class="card-foot"><strong>${PRIO_LABEL[e.topPrio]}</strong><span class="status-chip ${st.state}">${STATUS_ICON[st.state]} ${st.done}/${st.total}</span></div>
      </article>`;
  })
  .join('\n');

const stats = {
  epics: epics.length,
  stories: epics.reduce((a, e) => a + e.count, 0),
  must: epics.filter((e) => e.topPrio === 3).length,
  done: [...STATUS.values()].filter((v) => v === 'done').length,
  wip: [...STATUS.values()].filter((v) => v === 'wip').length
};

/* ------------------------------- HTML out -------------------------------- */

const body = renderMarkdown(md);

const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AuthorOS — Visual Backlog</title>
  <style>
    :root {
      --bg: #0b1020; --panel: #111832; --panel2: #151f3f;
      --text: #edf2ff; --muted: #a9b6d8;
      --cyan: #56d7ff; --violet: #9d7cff; --green: #5ef0a1; --yellow: #ffd166; --red: #ff6b6b;
      --line: rgba(255,255,255,.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top left, rgba(86,215,255,.18), transparent 34%),
                  radial-gradient(circle at top right, rgba(157,124,255,.18), transparent 34%),
                  var(--bg);
      color: var(--text); line-height: 1.55;
    }
    a { color: var(--cyan); }
    header { padding: 64px 8vw 40px; border-bottom: 1px solid var(--line); }
    .eyebrow { color: var(--cyan); text-transform: uppercase; letter-spacing: .16em; font-size: 13px; font-weight: 700; }
    h1 { font-size: clamp(42px, 7vw, 86px); line-height: .95; margin: 14px 0; }
    .subtitle { max-width: 860px; color: var(--muted); font-size: 20px; }
    .quote { margin-top: 28px; padding: 18px 22px; border-left: 4px solid var(--cyan);
      background: rgba(255,255,255,.05); border-radius: 12px; max-width: 760px; font-size: 22px; }
    .stats { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 26px; }
    .stat { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 14px 20px; }
    .stat b { font-size: 28px; display: block; color: var(--cyan); }
    .stat span { color: var(--muted); font-size: 13px; }
    main { padding: 40px 8vw 80px; }
    section { margin: 48px 0; }
    h2 { font-size: 32px; margin: 40px 0 18px; border-bottom: 1px solid var(--line); padding-bottom: 10px; }
    h3 { font-size: 22px; margin: 26px 0 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 18px; }
    .card {
      background: linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.035));
      border: 1px solid var(--line); border-radius: 20px; padding: 20px;
      min-height: 200px; display: flex; flex-direction: column;
      box-shadow: 0 24px 70px rgba(0,0,0,.25);
    }
    .card h3 { margin: 12px 0 8px; font-size: 20px; }
    .card p { color: var(--muted); flex: 1; }
    .card-top { display: flex; justify-content: space-between; align-items: center; color: var(--cyan); font-weight: 700; font-size: 13px; }
    .card-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
    .card-foot .count { color: var(--muted); font-size: 12px; }
    .pill { border: 1px solid var(--line); color: var(--text); border-radius: 999px; padding: 4px 10px; background: rgba(255,255,255,.06); }
    .must strong { color: var(--green); }
    .should strong { color: var(--yellow); }
    .could strong { color: var(--violet); }
    ul, ol { color: var(--muted); padding-left: 22px; }
    li { margin: 4px 0; }
    blockquote { margin: 16px 0; padding: 12px 18px; border-left: 4px solid var(--violet);
      background: rgba(157,124,255,.08); border-radius: 10px; color: var(--text); }
    code { background: rgba(255,255,255,.08); padding: 2px 6px; border-radius: 6px; font-size: .9em; }
    hr { border: none; border-top: 1px solid var(--line); margin: 36px 0; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); margin: 12px 0; }
    th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { background: var(--panel2); white-space: nowrap; }
    td { color: var(--muted); }
    .full { background: rgba(255,255,255,.02); border: 1px solid var(--line); border-radius: 22px; padding: 8px 30px 30px; }
    /* stato implementazione */
    .badge { font-size: 13px; font-weight: 700; vertical-align: middle; padding: 2px 10px; border-radius: 999px; border: 1px solid var(--line); }
    .badge.done { color: var(--green); background: rgba(94,240,161,.10); }
    .badge.wip { color: var(--yellow); background: rgba(255,209,102,.10); }
    .badge.todo { color: var(--muted); }
    tr.row-done td { color: var(--muted); text-decoration: line-through; opacity: .72; }
    tr.row-done td:first-child, tr.row-wip td:first-child, tr.row-todo td:first-child { text-decoration: none; white-space: nowrap; }
    tr.row-wip td:first-child { color: var(--yellow); }
    .status-chip { font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
    .status-chip.done { color: var(--green); background: rgba(94,240,161,.12); }
    .status-chip.wip { color: var(--yellow); background: rgba(255,209,102,.12); }
    .status-chip.todo { color: var(--muted); background: rgba(255,255,255,.05); }
    .card.epic-done { border-color: rgba(94,240,161,.45); }
    .card.epic-wip { border-color: rgba(255,209,102,.40); }
    .stat b.done { color: var(--green); }
    .stat b.wip { color: var(--yellow); }
    footer { padding: 32px 8vw; color: var(--muted); border-top: 1px solid var(--line); }
  </style>
</head>
<body>
  <header>
    <div class="eyebrow">Product Backlog · generato da AuthorOS_Backlog.md</div>
    <h1>AuthorOS</h1>
    <p class="subtitle">Un sistema operativo per scrittori: idea, struttura, draft, revisione, pubblicazione e marketing in un unico workspace modulare.</p>
    <div class="quote">“Scrivi il tuo libro più velocemente. Senza perdere la tua voce.”</div>
    <div class="stats">
      <div class="stat"><b>${stats.epics}</b><span>Epiche</span></div>
      <div class="stat"><b>${stats.stories}</b><span>User Story</span></div>
      <div class="stat"><b class="done">${stats.done}</b><span>✅ Completate</span></div>
      <div class="stat"><b class="wip">${stats.wip}</b><span>🔄 In corso</span></div>
      <div class="stat"><b>${stats.must}</b><span>Epiche con Must</span></div>
    </div>
  </header>

  <main>
    <section>
      <h2>Epiche a colpo d'occhio</h2>
      <div class="grid">
${epicCards}
      </div>
    </section>

    <section class="full">
      ${body}
    </section>
  </main>

  <footer>
    AuthorOS — Visual Backlog. File generato automaticamente: non modificare a mano,
    aggiorna <code>AuthorOS_Backlog.md</code> e rilancia <code>npm run backlog:html</code>.
  </footer>
</body>
</html>
`;

writeFileSync(OUT, html, 'utf8');
console.log(`✓ Generato ${OUT}`);
console.log(`  ${stats.epics} epiche, ${stats.stories} user story.`);
