#!/usr/bin/env node
/* Adiciona cartas específicas a uma coleção PERSONALIZADA já existente.
 * Útil quando a pokemontcg.io não traz o artista de um set novo (artist vazio)
 * e a carta não entrou na busca — aqui a gente afirma que ela pertence.
 *
 * Uso:
 *   node add_to_custom.js <collectionId> "<ref>" ["<ref2>" ...]
 *   ref = id da pokemontcg (ex.: me5-42)  OU  "Nome NUM/TOTAL" (ex.: "Mankey 42/84")
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'masterset', 'data');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';
const H = { headers: { 'User-Agent': UA, 'Accept': 'application/json' } };

const [, , CID, ...REFS] = process.argv;
if (!CID || !REFS.length) { console.error('uso: node add_to_custom.js <collectionId> "<ref>" [...]'); process.exit(1); }

async function get(u, t = 5) { let l; for (let i = 0; i < t; i++) { try { const r = await fetch(u, H); if (r.status >= 500) throw new Error('HTTP ' + r.status); return await r.json(); } catch (e) { l = e; await new Promise(s => setTimeout(s, 900 * (i + 1))); } } throw l; }
async function thumb(url) { try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) return ''; const b = Buffer.from(await r.arrayBuffer()); const o = await sharp(b).resize({ width: 150 }).webp({ quality: 72 }).toBuffer(); return 'data:image/webp;base64,' + o.toString('base64'); } catch (e) { return ''; } }
function mapVariants(p) { const out = []; const add = k => { if (!out.includes(k)) out.push(k); }; p = p || {};
  if (p.normal || p.unlimited) add('normal'); if (p.holofoil || p.unlimitedHolofoil) add('holofoil');
  if (p.reverseHolofoil) add('reverseHolofoil'); if (p['1stEdition']) add('1stEdition'); if (p['1stEditionHolofoil']) add('1stEditionHolofoil');
  if (!out.length) add('normal'); const O = ['normal', 'holofoil', 'reverseHolofoil', '1stEdition', '1stEditionHolofoil'];
  return out.sort((a, b) => (O.indexOf(a) < 0 ? 9 : O.indexOf(a)) - (O.indexOf(b) < 0 ? 9 : O.indexOf(b))); }
function priceOf(p, v) { p = p || {}; const k = o => o && (o.market ?? o.mid ?? o.low) || 0;
  if (v === 'normal') return k(p.normal) || k(p.unlimited); if (v === 'holofoil') return k(p.holofoil) || k(p.unlimitedHolofoil);
  if (v === 'reverseHolofoil') return k(p.reverseHolofoil); if (v === '1stEdition') return k(p['1stEdition']); if (v === '1stEditionHolofoil') return k(p['1stEditionHolofoil']); return 0; }

async function resolve(ref) {
  if (/^[a-z0-9]+-[a-z0-9]+$/i.test(ref) && !ref.includes('/')) { // id pokemontcg
    const j = await get('https://api.pokemontcg.io/v2/cards/' + encodeURIComponent(ref)); return j.data;
  }
  const m = ref.match(/^(.+?)\s+(\d+)\/(\d+)$/); // "Nome NUM/TOTAL"
  if (m) { const [, name, num, tot] = m;
    const j = await get('https://api.pokemontcg.io/v2/cards?q=' + encodeURIComponent('name:"' + name.trim() + '" number:' + num) + '&pageSize=50');
    return (j.data || []).find(c => String(c.set.printedTotal) === tot) || (j.data || [])[0];
  }
  const j = await get('https://api.pokemontcg.io/v2/cards?q=' + encodeURIComponent(ref) + '&pageSize=10'); return (j.data || [])[0];
}

(async () => {
  const dataFile = path.join(DATA_DIR, CID + '.json');
  if (!fs.existsSync(dataFile)) { console.error('coleção ' + CID + ' não existe (' + dataFile + ')'); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const have = new Set(data.rows.map(r => r.id));
  let added = 0;
  for (const ref of REFS) {
    let c; try { c = await resolve(ref); } catch (e) { console.log('  FALHOU resolver "' + ref + '": ' + e.message); continue; }
    if (!c) { console.log('  não encontrado: "' + ref + '"'); continue; }
    if (have.has(c.id)) { console.log('  já existe: ' + c.id + ' (' + c.name + ')'); continue; }
    const prices = c.tcgplayer && c.tcgplayer.prices; const variants = mapVariants(prices);
    const p = {}; variants.forEach(v => { const pr = priceOf(prices, v); if (pr) p[v] = pr; });
    const img = await thumb((c.images && (c.images.small || c.images.large)) || '');
    data.rows.push({ id: c.id, number: c.number, name: c.name, rarity: c.rarity || '', artist: c.artist || data.query || '',
      set: (c.set && c.set.name) || '', variants, p, img });
    have.add(c.id); added++;
    console.log('  + ' + c.id + ' ' + c.name + ' (' + c.set.name + ' ' + c.number + ') -> ' + variants.join(',') + (img ? '' : ' [sem img]'));
  }
  if (!added) { console.log('nada adicionado.'); return; }
  // reordena por data de lançamento do set p/ manter a ordem do restante não é trivial sem releaseDate — mantém append
  data.totalSlots = data.rows.reduce((a, r) => a + r.variants.length, 0);
  data.fullValue = data.rows.reduce((a, r) => a + r.variants.reduce((b, v) => b + ((r.p && r.p[v]) || 0), 0), 0);
  data.total = data.rows.length; data.printedTotal = data.rows.length;
  fs.writeFileSync(dataFile, JSON.stringify(data), 'utf8');

  const idxPath = path.join(ROOT, 'masterset', 'sets_index.json');
  const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
  const e = idx.find(s => s.id === CID);
  if (e) { e.totalSlots = data.totalSlots; e.total = data.rows.length; e.printedTotal = data.rows.length; }
  fs.writeFileSync(idxPath, JSON.stringify(idx), 'utf8');
  console.log(added + ' carta(s) adicionada(s). Agora ' + data.rows.length + ' cartas, ' + data.totalSlots + ' slots, $' + data.fullValue.toFixed(2));
})();
