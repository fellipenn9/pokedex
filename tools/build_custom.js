#!/usr/bin/env node
/* Gera uma COLEÇÃO PERSONALIZADA (por artista ou por Pokémon) a partir da
 * pokemontcg.io — cartas de todos os sets, com variação (normal/holo/reverse/
 * 1ª Ed), miniatura base64 e preço de mercado (TCGplayer). Grava
 * masterset/data/<id>.json e cria/atualiza a entrada no índice do app com
 * flag custom:true.
 *
 * Uso:
 *   node build_custom.js artist "Yuka Morii"
 *   node build_custom.js pokemon "Corsola, Mareep, Flaaffy" "Meus favoritos"
 *   (3º arg opcional = nome exibido; 4º opcional = cor hex)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'masterset', 'data');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';
const H = { headers: { 'User-Agent': UA, 'Accept': 'application/json' } };

const [, , KIND, QUERY, NAME_IN, COLOR_IN] = process.argv;
if (!KIND || !QUERY || !['artist', 'pokemon'].includes(KIND)) {
  console.error('uso: node build_custom.js <artist|pokemon> "<valor>" ["Nome exibido"] [corHex]'); process.exit(1);
}
const slug = (KIND === 'artist' ? 'art_' : 'poke_') + QUERY.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const NAME = NAME_IN || QUERY;
const COLOR = COLOR_IN || (KIND === 'artist' ? '#6c7bff' : '#e05aa0');

function buildQ() {
  if (KIND === 'artist') return 'artist:"' + QUERY + '"';
  const names = QUERY.split(',').map(s => s.trim()).filter(Boolean);
  return '(' + names.map(n => 'name:"' + n + '"').join(' OR ') + ')';
}
async function jget(url, tries = 5) { let last; for (let i = 0; i < tries; i++) { try { const r = await fetch(url, H); if (r.status >= 500) throw new Error('HTTP ' + r.status); return await r.json(); } catch (e) { last = e; await new Promise(s => setTimeout(s, 900 * (i + 1))); } } throw last; }
async function thumb(url) { try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) return ''; const b = Buffer.from(await r.arrayBuffer()); const o = await sharp(b).resize({ width: 150 }).webp({ quality: 72 }).toBuffer(); return 'data:image/webp;base64,' + o.toString('base64'); } catch (e) { return ''; } }

// mapeia os "price buckets" do TCGplayer para os chips de variação do app
function mapVariants(prices) {
  const out = []; const add = k => { if (!out.includes(k)) out.push(k); };
  const k = prices || {};
  if (k.normal || k.unlimited) add('normal');
  if (k.holofoil || k.unlimitedHolofoil) add('holofoil');
  if (k.reverseHolofoil) add('reverseHolofoil');
  if (k['1stEdition']) add('1stEdition');
  if (k['1stEditionHolofoil']) add('1stEditionHolofoil');
  if (!out.length) add('normal');
  const ORD = ['normal', 'holofoil', 'reverseHolofoil', '1stEdition', '1stEditionHolofoil'];
  return out.sort((a, b) => (ORD.indexOf(a) < 0 ? 9 : ORD.indexOf(a)) - (ORD.indexOf(b) < 0 ? 9 : ORD.indexOf(b)));
}
function priceOf(prices, v) {
  const k = prices || {}; const pick = o => o && (o.market ?? o.mid ?? o.low) || 0;
  if (v === 'normal') return pick(k.normal) || pick(k.unlimited);
  if (v === 'holofoil') return pick(k.holofoil) || pick(k.unlimitedHolofoil);
  if (v === 'reverseHolofoil') return pick(k.reverseHolofoil);
  if (v === '1stEdition') return pick(k['1stEdition']);
  if (v === '1stEditionHolofoil') return pick(k['1stEditionHolofoil']);
  return 0;
}

(async () => {
  const q = encodeURIComponent(buildQ());
  let page = 1, all = [];
  while (true) {
    const j = await jget(`https://api.pokemontcg.io/v2/cards?q=${q}&page=${page}&pageSize=250&orderBy=set.releaseDate`);
    const data = j.data || []; all = all.concat(data);
    if (data.length < 250) break; page++;
    if (page > 20) break;
  }
  console.log(KIND + ' "' + QUERY + '" -> ' + all.length + ' cartas');

  const rows = all.map(c => {
    const prices = c.tcgplayer && c.tcgplayer.prices;
    const variants = mapVariants(prices);
    const p = {}; variants.forEach(v => { const pr = priceOf(prices, v); if (pr) p[v] = pr; });
    return { id: c.id, number: c.number, name: c.name, rarity: c.rarity || '', artist: c.artist || '',
      set: (c.set && c.set.name) || '', variants, p,
      imgUrl: (c.images && (c.images.small || c.images.large)) || '', img: '' };
  });
  let ok = 0;
  for (let i = 0; i < rows.length; i += 6) {
    const b = rows.slice(i, i + 6);
    const res = await Promise.all(b.map(r => r.imgUrl ? thumb(r.imgUrl) : Promise.resolve('')));
    b.forEach((r, j) => { r.img = res[j]; if (res[j]) ok++; delete r.imgUrl; });
    process.stdout.write('  imgs ' + Math.min(i + 6, rows.length) + '/' + rows.length + '\r');
  }
  const totalSlots = rows.reduce((a, r) => a + r.variants.length, 0);
  const fullValue = rows.reduce((a, r) => a + r.variants.reduce((b, v) => b + ((r.p && r.p[v]) || 0), 0), 0);
  const seriesName = KIND === 'artist' ? 'Personalizada · Artista' : 'Personalizada · Pokémon';
  const data = { setId: slug, setName: NAME, series: 'custom', category: 'EN', custom: true, kind: KIND, query: QUERY,
    total: rows.length, printedTotal: rows.length, releaseDate: '', totalSlots, fullValue, rows };
  fs.writeFileSync(path.join(DATA_DIR, slug + '.json'), JSON.stringify(data), 'utf8');
  console.log('\n  ' + rows.length + ' cartas, ' + totalSlots + ' slots, imgs ' + ok + ', $' + fullValue.toFixed(2));

  // índice do app
  const idxPath = path.join(ROOT, 'masterset', 'sets_index.json');
  const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
  const entry = { id: slug, name: NAME, namePt: NAME, slug: '', series: 'custom', seriesName,
    category: 'EN', total: rows.length, printedTotal: rows.length, releaseDate: '', hasData: true,
    totalSlots, custom: true, kind: KIND, query: QUERY, color: COLOR, sym64: '', logo64: '' };
  const i = idx.findIndex(s => s.id === slug);
  if (i >= 0) idx[i] = { ...idx[i], ...entry }; else idx.push(entry);
  fs.writeFileSync(idxPath, JSON.stringify(idx), 'utf8');
  console.log('índice: entrada "' + slug + '" ' + (i >= 0 ? 'atualizada' : 'criada') + ' (custom ' + KIND + ', cor ' + COLOR + ')');
})();
