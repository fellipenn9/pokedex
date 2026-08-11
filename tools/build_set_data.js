#!/usr/bin/env node
/* Gera masterset/data/{setId}.json (cartas+variações + miniatura base64 ~150px)
 * para o app sincronizado. Resume: pula sets já gerados. Uso: node build_set_data.js */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'masterset', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';

const VORDER = ['normal','holofoil','reverseHolofoil','energyPattern','pokeballPattern','duskballPattern','loveBallPattern','friendballPattern','quickballPattern','rocketPattern'];

const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'sets_index.json'), 'utf8'));
const TARGET_IDS = ['base1','base3','base2','cel25','cel25c','dc1','me02','me01','MEP','me03','me02pt5','me04','me05',
  'mcd24','mcd23','mcd22','mcd21','mcd19','mcd18','mcd17','mcd16','mcd15','mcd14','mcd12','mcd11'];
const TARGETS = TARGET_IDS.map(id => idx.find(s => s.id === id)).filter(Boolean);

async function jget(url, tries = 4) { let last; for (let i = 0; i < tries; i++) { try { const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } catch (e) { last = e; await new Promise(res => setTimeout(res, 800 * (i + 1))); } } throw last; }
async function thumb(url) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) return '';
    const buf = Buffer.from(await r.arrayBuffer());
    const out = await sharp(buf).resize({ width: 150 }).webp({ quality: 72 }).toBuffer();
    return 'data:image/webp;base64,' + out.toString('base64'); } catch (e) { return ''; }
}

(async () => {
  console.log('Sets a gerar: ' + TARGETS.length);
  for (const meta of TARGETS) {
    const outFile = path.join(DATA_DIR, meta.id + '.json');
    if (fs.existsSync(outFile)) { console.log('  (pula ' + meta.id + ' — já existe)'); continue; }
    let cards = [];
    try { cards = (await jget(`https://api.tcg.gg/pkmn/v1/series/${meta.series}/${meta.slug}/cards`)).value || []; }
    catch (e) { console.log('  FALHOU cards ' + meta.id + ': ' + e.message); continue; }
    const rows = cards.map(c => ({ id: c.id, number: c.numberDisplay || c.number, name: c.name, rarity: c.rarity || '',
      artist: c.artist || '', variants: VORDER.filter(k => c.variantMap && c.variantMap[k]),
      imgUrl: c.thumbImageUrl || c.largeImageUrl || '', img: '' }));
    let ok = 0;
    for (let i = 0; i < rows.length; i += 6) {
      const b = rows.slice(i, i + 6);
      const res = await Promise.all(b.map(r => r.imgUrl ? thumb(r.imgUrl) : Promise.resolve('')));
      b.forEach((r, j) => { r.img = res[j]; if (res[j]) ok++; delete r.imgUrl; });
    }
    const totalSlots = rows.reduce((s, r) => s + r.variants.length, 0);
    const data = { setId: meta.id, setName: meta.name, series: meta.series, category: meta.category,
      total: meta.total, printedTotal: meta.printedTotal, releaseDate: meta.releaseDate, totalSlots, rows };
    fs.writeFileSync(outFile, JSON.stringify(data), 'utf8');
    console.log('  ' + meta.id + ' ' + meta.name + ' → ' + rows.length + ' cartas, ' + totalSlots + ' slots, imgs ' + ok + ' (' + (fs.statSync(outFile).size / 1048576).toFixed(2) + ' MB)');
  }
  // índice enxuto com flag hasData p/ o navegador
  const ids = new Set(fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')));
  const lite = idx.map(s => ({ id: s.id, name: s.name, slug: s.slug, series: s.series, seriesName: s.seriesName,
    category: s.category, total: s.total, printedTotal: s.printedTotal, releaseDate: s.releaseDate, symbol: s.symbol, hasData: ids.has(s.id) }));
  fs.writeFileSync(path.join(ROOT, 'masterset', 'sets_index.json'), JSON.stringify(lite), 'utf8');
  console.log('índice: ' + lite.length + ' sets (' + [...ids].length + ' com dados) → masterset/sets_index.json');
})();
