#!/usr/bin/env node
/* Enriquece os dados do masterset:
 *  - adiciona preços por variação (variantMap[k].price, USD) em cada carta dos data files
 *    (row.p = {variantKey: preço}) + data.fullValue (valor do set completo)
 *  - adiciona logo64 (base64 da logo do set) ao masterset/sets_index.json p/ os sets com dados
 * Uso: node enrich_masterset.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';

async function jget(url, tries = 4) {
  let last; for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { last = e; await new Promise(res => setTimeout(res, 700 * (i + 1))); }
  } throw last;
}
async function logoB64(url) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) return ''; const b = Buffer.from(await r.arrayBuffer());
    const out = await sharp(b).resize({ width: 300 }).webp({ quality: 78 }).toBuffer(); return 'data:image/webp;base64,' + out.toString('base64'); } catch (e) { return ''; }
}

(async () => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'sets_index.json'), 'utf8'));
  const rawById = {}; raw.forEach(s => { if (!rawById[s.id] || s.category === 'EN') rawById[s.id] = s; });
  const idxPath = path.join(ROOT, 'masterset', 'sets_index.json');
  const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
  const dataDir = path.join(ROOT, 'masterset', 'data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  for (const f of files) {
    const id = f.replace('.json', '');
    const meta = rawById[id]; if (!meta) { console.log('  sem meta p/ ' + id); continue; }
    // preços
    let cards = [];
    try { cards = (await jget(`https://api.tcg.gg/pkmn/v1/series/${meta.series}/${meta.slug}/cards`)).value || []; }
    catch (e) { console.log('  preços falhou ' + id + ': ' + e.message); }
    const pmap = {};
    for (const c of cards) { const vm = c.variantMap || {}; const o = {}; for (const k in vm) if (typeof vm[k].price === 'number') o[k] = Math.round(vm[k].price * 100) / 100; pmap[c.id] = o; }
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
    let full = 0;
    for (const r of data.rows) {
      const pm = pmap[r.id] || {}; const p = {};
      for (const v of (r.variants || [])) if (pm[v] != null) { p[v] = pm[v]; full += pm[v]; }
      r.p = p;
    }
    data.fullValue = Math.round(full * 100) / 100;
    fs.writeFileSync(path.join(dataDir, f), JSON.stringify(data), 'utf8');

    // logo64 no índice
    const e = idx.find(x => x.id === id);
    if (e && meta.logo) e.logo64 = await logoB64(meta.logo);
    console.log('  ' + id + ' → preços ok, fullValue $' + data.fullValue + (e && e.logo64 ? ', logo ok' : ''));
  }
  fs.writeFileSync(idxPath, JSON.stringify(idx), 'utf8');
  console.log('feito. índice + ' + files.length + ' data files enriquecidos.');
})();
