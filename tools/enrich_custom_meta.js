#!/usr/bin/env node
/* Preenche `types` (tipo do Pokémon) e `date` (lançamento do set) nas cartas de
 * coleções PERSONALIZADAS já geradas, SEM rebaixar imagem. Busca em lote pela
 * query original e completa por id as que faltarem (ex.: cartas adicionadas à mão).
 * Uso: node enrich_custom_meta.js <collectionId|all> */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'masterset', 'data');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';
const H = { headers: { 'User-Agent': UA, 'Accept': 'application/json' } };
const ARG = process.argv[2];
if (!ARG) { console.error('uso: node enrich_custom_meta.js <collectionId|all>'); process.exit(1); }

async function get(u, t = 6) { let l; for (let i = 0; i < t; i++) { try { const r = await fetch(u, H); if (r.status >= 500) throw new Error('HTTP ' + r.status); return await r.json(); } catch (e) { l = e; await new Promise(s => setTimeout(s, 1000 * (i + 1))); } } throw l; }
function buildQ(kind, query) {
  if (kind === 'artist') return 'artist:"' + query + '"';
  return '(' + query.split(',').map(s => s.trim()).filter(Boolean).map(n => 'name:"' + n + '"').join(' OR ') + ')';
}

async function enrich(id) {
  const f = path.join(DATA_DIR, id + '.json');
  if (!fs.existsSync(f)) { console.log('  (pula ' + id + ' — sem data file)'); return; }
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!d.custom) { console.log('  (pula ' + id + ' — não é custom)'); return; }
  const meta = {}; // id -> {types, date}
  // 1) em lote pela query original
  if (d.kind && d.query) {
    const q = encodeURIComponent(buildQ(d.kind, d.query));
    let page = 1;
    while (true) {
      let j; try { j = await get(`https://api.pokemontcg.io/v2/cards?q=${q}&page=${page}&pageSize=250&orderBy=set.releaseDate`); } catch (e) { console.log('  lote falhou pág ' + page + ': ' + e.message); break; }
      const arr = j.data || []; arr.forEach(c => { meta[c.id] = { types: c.types || [], date: (c.set && c.set.releaseDate) || '' }; });
      if (arr.length < 250) break; page++; if (page > 20) break;
    }
  }
  // 2) completa por id as que faltam
  let miss = d.rows.filter(r => !meta[r.id]);
  for (const r of miss) {
    try { const j = await get('https://api.pokemontcg.io/v2/cards/' + encodeURIComponent(r.id)); const c = j.data; if (c) meta[r.id] = { types: c.types || [], date: (c.set && c.set.releaseDate) || '' }; }
    catch (e) { /* deixa sem */ }
  }
  let n = 0;
  d.rows.forEach(r => { const m = meta[r.id]; if (m) { r.types = m.types; r.date = m.date; n++; } else { if (!r.types) r.types = []; if (!r.date) r.date = ''; } });
  fs.writeFileSync(f, JSON.stringify(d), 'utf8');
  const withType = d.rows.filter(r => r.types && r.types.length).length;
  console.log('  ' + id + ': ' + n + '/' + d.rows.length + ' preenchidas · ' + withType + ' com tipo');
}

(async () => {
  let ids;
  if (ARG === 'all') {
    const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'masterset', 'sets_index.json'), 'utf8'));
    ids = idx.filter(s => s.custom).map(s => s.id);
  } else ids = [ARG];
  console.log('enriquecendo:', ids.join(', '));
  for (const id of ids) await enrich(id);
  console.log('OK');
})();
