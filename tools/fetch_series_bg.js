#!/usr/bin/env node
/* Baixa as artes de fundo por SÉRIE do pkmn.gg, otimiza e embute em base64 →
 * masterset/series_bg.json = { seriesId: dataURI }. Usado como fundo cênico
 * por coleção (agrupado por série). Uso: node fetch_series_bg.js */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';

(async () => {
  const series = (await (await fetch('https://api.tcg.gg/pkmn/v1/series', { headers: { 'User-Agent': UA, 'Accept': 'application/json' } })).json()).value || [];
  // séries que aparecem nas coleções com dados + as principais
  const want = new Set(['mega-evolution', 'base', 'sword-shield', 'xy', 'other', 'scarlet-violet', 'sun-moon', 'black-white', 'diamond-pearl']);
  const out = {};
  for (const s of series) {
    if (!want.has(s.id) || !s.background) continue;
    try {
      const buf = Buffer.from(await (await fetch(s.background, { headers: { 'User-Agent': UA } })).arrayBuffer());
      const web = await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 68 }).toBuffer();
      out[s.id] = 'data:image/webp;base64,' + web.toString('base64');
      console.log('  ' + s.id + ' → ' + (web.length / 1024).toFixed(0) + ' KB');
    } catch (e) { console.log('  ' + s.id + ' falhou: ' + e.message); }
  }
  fs.writeFileSync(path.join(ROOT, 'masterset', 'series_bg.json'), JSON.stringify(out), 'utf8');
  const sz = fs.statSync(path.join(ROOT, 'masterset', 'series_bg.json')).size;
  console.log('series_bg.json: ' + Object.keys(out).length + ' séries, ' + (sz / 1024).toFixed(0) + ' KB');
})();
