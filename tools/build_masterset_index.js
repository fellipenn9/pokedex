#!/usr/bin/env node
/* Índice do app: dedup por id (prefere EN) + base64 do símbolo p/ sets com dados
 * (site.pkmn.gg é bloqueado). Uso: node build_masterset_index.js */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'masterset', 'data');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';

async function symB64(url) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) return ''; const b = Buffer.from(await r.arrayBuffer());
    const out = await sharp(b).resize({ width: 48 }).webp({ quality: 80 }).toBuffer(); return 'data:image/webp;base64,' + out.toString('base64'); } catch (e) { return ''; }
}

(async () => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'sets_index.json'), 'utf8'));
  const dataIds = new Set(fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')));
  const slots = {}; for (const id of dataIds) { try { slots[id] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, id + '.json'), 'utf8')).totalSlots; } catch (e) {} }

  // dedup por id (prefere categoria EN; senão a 1ª)
  const byId = {};
  for (const s of raw) { const cur = byId[s.id]; if (!cur || (s.category === 'EN' && cur.category !== 'EN')) byId[s.id] = s; }
  const uniq = Object.values(byId);

  let done = 0;
  const out = [];
  for (const s of uniq) {
    const has = dataIds.has(s.id);
    let sym64 = '';
    if (has && s.symbol) { sym64 = await symB64(s.symbol); done++; }
    out.push({ id: s.id, name: s.name, slug: s.slug, series: s.series, seriesName: s.seriesName,
      category: s.category, total: s.total, printedTotal: s.printedTotal, releaseDate: s.releaseDate,
      hasData: has, totalSlots: slots[s.id] || 0, sym64 });
  }
  // ordena: por releaseDate desc (novos primeiro)
  out.sort((a, b) => String(b.releaseDate).localeCompare(String(a.releaseDate)));
  fs.writeFileSync(path.join(ROOT, 'masterset', 'sets_index.json'), JSON.stringify(out), 'utf8');
  console.log('índice: ' + out.length + ' sets únicos (' + dataIds.size + ' com dados, ' + done + ' símbolos base64)');
})();
