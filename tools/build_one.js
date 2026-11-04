#!/usr/bin/env node
/* Gera o data file de UMA coleção e atualiza o índice do app.
 * Uso: node build_one.js <setId> [namePt] [colorHex]
 * Lê series/slug do índice-raiz (sets_index.json). */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'masterset', 'data');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';
const H = { headers: { 'User-Agent': UA, 'Accept': 'application/json' } };
const VORDER = ['normal', 'holofoil', 'reverseHolofoil', 'energyPattern', 'pokeballPattern', 'duskballPattern', 'loveBallPattern', 'friendballPattern', 'quickballPattern', 'rocketPattern'];

const [, , SET_ID, NAME_PT, COLOR] = process.argv;
if (!SET_ID) { console.error('uso: node build_one.js <setId> [namePt] [colorHex]'); process.exit(1); }

async function jget(url, tries = 4) { let last; for (let i = 0; i < tries; i++) { try { const r = await fetch(url, H); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } catch (e) { last = e; await new Promise(res => setTimeout(res, 700 * (i + 1))); } } throw last; }
async function imgB64(url, w, q) { try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) return ''; const b = Buffer.from(await r.arrayBuffer()); const o = await sharp(b).resize({ width: w }).webp({ quality: q }).toBuffer(); return 'data:image/webp;base64,' + o.toString('base64'); } catch (e) { return ''; } }
function hx(n) { return ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2); }
function punch(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 22) return null; const f = 1.35, a = (r + g + b) / 3; r = a + (r - a) * f; g = a + (g - a) * f; b = a + (b - a) * f; const l = Math.max(r, g, b); if (l < 150) { const s = 150 / (l || 1); r *= s; g *= s; b *= s; } return '#' + hx(r) + hx(g) + hx(b); }

(async () => {
  const root = JSON.parse(fs.readFileSync(path.join(ROOT, 'sets_index.json'), 'utf8'));
  const meta = root.find(s => s.id === SET_ID);
  if (!meta) { console.error('set ' + SET_ID + ' não está no índice-raiz'); process.exit(1); }
  console.log(SET_ID + ' -> series=' + meta.series + ' slug=' + meta.slug);

  const cards = (await jget(`https://api.tcg.gg/pkmn/v1/series/${meta.series}/${meta.slug}/cards`)).value || [];
  const rows = cards.map(c => {
    let variants = VORDER.filter(k => c.variantMap && c.variantMap[k]);
    if (!variants.length && c.variantMap) variants = Object.keys(c.variantMap);
    const p = {}; variants.forEach(k => { const pr = c.variantMap && c.variantMap[k] && c.variantMap[k].price; if (pr != null) p[k] = pr; });
    return { id: c.id, number: c.numberDisplay || c.number, name: c.name, rarity: c.rarity || '', artist: c.artist || '', variants, p, imgUrl: c.thumbImageUrl || c.largeImageUrl || '', img: '' };
  });
  let ok = 0;
  for (let i = 0; i < rows.length; i += 6) {
    const b = rows.slice(i, i + 6);
    const res = await Promise.all(b.map(r => r.imgUrl ? imgB64(r.imgUrl, 150, 72) : Promise.resolve('')));
    b.forEach((r, j) => { r.img = res[j]; if (res[j]) ok++; delete r.imgUrl; });
  }
  const totalSlots = rows.reduce((a, r) => a + r.variants.length, 0);
  const fullValue = rows.reduce((a, r) => a + r.variants.reduce((b, v) => b + ((r.p && r.p[v]) || 0), 0), 0);
  const data = { setId: SET_ID, setName: meta.name, series: meta.series, category: meta.category, total: meta.total, printedTotal: meta.printedTotal, releaseDate: meta.releaseDate, totalSlots, fullValue, rows };
  fs.writeFileSync(path.join(DATA_DIR, SET_ID + '.json'), JSON.stringify(data), 'utf8');
  console.log('  ' + rows.length + ' cartas, ' + totalSlots + ' slots, imgs ' + ok + ', $' + fullValue.toFixed(2));

  const logo64 = meta.logo ? await imgB64(meta.logo, 320, 82) : '';
  let color = COLOR || '';
  if (!color && logo64) { try { const { dominant } = await sharp(Buffer.from(logo64.split(',')[1], 'base64')).resize(48, 48, { fit: 'inside' }).stats(); color = punch(dominant.r, dominant.g, dominant.b) || ''; } catch (e) {} }

  const appPath = path.join(ROOT, 'masterset', 'sets_index.json');
  const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
  let n = 0;
  app.forEach(s => { if (s.id !== SET_ID) return; s.hasData = true; s.totalSlots = totalSlots; if (logo64) s.logo64 = logo64; if (color) s.color = color; if (NAME_PT) s.namePt = NAME_PT; n++; });
  fs.writeFileSync(appPath, JSON.stringify(app), 'utf8');
  console.log('app: ' + n + ' entrada(s) atualizada(s), cor=' + (color || '—') + ', namePt=' + (NAME_PT || meta.name));
})();
