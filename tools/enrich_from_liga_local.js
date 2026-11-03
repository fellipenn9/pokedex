#!/usr/bin/env node
/* Preenche liga_prices nas cartas SEM preço do fullart_cards.json usando o
 * liga_cards.json LOCAL (offline, rápido). Casa por dex + número + nome. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const fa = JSON.parse(fs.readFileSync(path.join(ROOT, 'fullart_cards.json'), 'utf8'));
const liga = JSON.parse(fs.readFileSync(path.join(ROOT, 'liga_cards.json'), 'utf8'));

const norm = n => String(n || '').trim().toLowerCase().replace(/^0+/, '');
const tok = s => new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean));
const score = (a, b) => { const A = tok(a), B = tok(b); let n = 0; A.forEach(t => { if (B.has(t)) n++; }); return n; };
const hasPrice = c => c.liga_prices && typeof c.liga_prices === 'object' && Object.values(c.liga_prices).some(v => v && v.low > 0);

// índice por id (cartas aparecem sob vários dex)
const idCards = {}, idDex = {};
for (const [dex, e] of Object.entries(fa.by_pokedex)) for (const c of e.cards) { (idCards[c.id] = idCards[c.id] || []).push(c); if (!idDex[c.id]) idDex[c.id] = dex; }

const today = new Date().toISOString().slice(0, 16).replace('T', ' ');
let filled = 0;
for (const id of Object.keys(idCards)) {
  if (idCards[id].some(hasPrice)) continue;
  const ref = idCards[id][0];
  const cands = (liga[idDex[id]] || []).filter(l => norm(l.number) === norm(ref.number) && l.priceHigh > 0);
  if (!cands.length) continue;
  let best = cands[0], bs = -1;
  cands.forEach(c => { const s = score(ref.name, c.name); if (s > bs) { bs = s; best = c; } });
  const lp = { '0': { low: best.priceLow, mid: 0, high: best.priceHigh } };
  idCards[id].forEach(c => { c.liga_prices = lp; c.liga_details = Object.assign({}, c.liga_details || {}, { set_code: best.set_code, stock_min: best.priceLow, stock_max: best.priceHigh }); c.liga_scraped_at = today; });
  filled++;
}
fs.writeFileSync(path.join(ROOT, 'fullart_cards.json'), JSON.stringify(fa, null, 2), 'utf8');
// stats
let wp = 0, seen = new Set();
for (const e of Object.values(fa.by_pokedex)) for (const c of e.cards) { if (!seen.has(c.id)) { seen.add(c.id); if (hasPrice(c)) wp++; } }
console.log('Preenchidas nesta passada:', filled, '| com preço agora:', wp, '/', seen.size);
