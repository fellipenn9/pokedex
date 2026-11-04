#!/usr/bin/env node
/* Gera os data files das coleções McDonald's (série 'other') e corrige o índice.
 * O índice guardou o slug slugificado do nome (mcdonald-s-collection-AAAA) que dá
 * 404; o slug real da API é mcdonalds-collection-AAAA. Uso: node build_mcd.js */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'masterset', 'data');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';
const H = { headers: { 'User-Agent': UA, 'Accept': 'application/json' } };
const VORDER = ['normal', 'holofoil', 'reverseHolofoil', 'energyPattern', 'pokeballPattern', 'duskballPattern', 'loveBallPattern', 'friendballPattern', 'quickballPattern', 'rocketPattern'];
const MCD_GOLD = '#ffc72c';

async function jget(url, tries = 4) { let last; for (let i = 0; i < tries; i++) { try { const r = await fetch(url, H); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } catch (e) { last = e; await new Promise(res => setTimeout(res, 700 * (i + 1))); } } throw last; }
async function imgB64(url, w, q) { try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) return ''; const b = Buffer.from(await r.arrayBuffer()); const o = await sharp(b).resize({ width: w }).webp({ quality: q }).toBuffer(); return 'data:image/webp;base64,' + o.toString('base64'); } catch (e) { return ''; } }

(async () => {
  const sets = (await jget('https://api.tcg.gg/pkmn/v1/series/other/sets')).value || [];
  const mcd = sets.filter(s => /^mcd/.test(s.id));
  console.log('McDonald\'s sets:', mcd.length);

  const slugFix = {};   // id -> slug real
  const logo64 = {};    // id -> logo base64

  for (const meta of mcd) {
    const slug = meta.slug;
    slugFix[meta.id] = slug;
    const outFile = path.join(DATA_DIR, meta.id + '.json');
    let cards;
    try { cards = (await jget(`https://api.tcg.gg/pkmn/v1/series/other/${slug}/cards`)).value || []; }
    catch (e) { console.log('  FALHOU ' + meta.id + ' (' + slug + '): ' + e.message); continue; }

    const rows = cards.map(c => {
      let variants = VORDER.filter(k => c.variantMap && c.variantMap[k]);
      if (!variants.length && c.variantMap) variants = Object.keys(c.variantMap);
      const p = {};
      variants.forEach(k => { const pr = c.variantMap && c.variantMap[k] && c.variantMap[k].price; if (pr != null) p[k] = pr; });
      return { id: c.id, number: c.numberDisplay || c.number, name: c.name, rarity: c.rarity || '',
        artist: c.artist || '', variants, p, imgUrl: c.thumbImageUrl || c.largeImageUrl || '', img: '' };
    });
    let ok = 0;
    for (let i = 0; i < rows.length; i += 6) {
      const b = rows.slice(i, i + 6);
      const res = await Promise.all(b.map(r => r.imgUrl ? imgB64(r.imgUrl, 150, 72) : Promise.resolve('')));
      b.forEach((r, j) => { r.img = res[j]; if (res[j]) ok++; delete r.imgUrl; });
    }
    const totalSlots = rows.reduce((a, r) => a + r.variants.length, 0);
    const fullValue = rows.reduce((a, r) => a + r.variants.reduce((b, v) => b + ((r.p && r.p[v]) || 0), 0), 0);
    const data = { setId: meta.id, setName: meta.name, series: 'other', category: meta.category,
      total: meta.total, printedTotal: meta.printedTotal, releaseDate: meta.releaseDate, totalSlots, fullValue, rows };
    fs.writeFileSync(outFile, JSON.stringify(data), 'utf8');

    if (meta.logo) logo64[meta.id] = await imgB64(meta.logo, 320, 82);
    console.log('  ' + meta.id + ' ' + meta.name + ' -> ' + rows.length + ' cartas, ' + totalSlots + ' slots, imgs ' + ok + ', $' + fullValue.toFixed(2));
  }

  // --- corrige os dois índices: slug, hasData, totalSlots, logo64, color, namePt ---
  const dataIds = new Set(fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')));
  const slotsOf = id => { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, id + '.json'), 'utf8')).totalSlots; } catch (e) { return 0; } };

  // raiz (usado pelos geradores): só corrige o slug
  const rootPath = path.join(ROOT, 'sets_index.json');
  const root = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
  let rf = 0; root.forEach(s => { if (slugFix[s.id] && s.slug !== slugFix[s.id]) { s.slug = slugFix[s.id]; rf++; } });
  fs.writeFileSync(rootPath, JSON.stringify(root), 'utf8');
  console.log('raiz: ' + rf + ' slugs corrigidos');

  // app
  const appPath = path.join(ROOT, 'masterset', 'sets_index.json');
  const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
  let af = 0;
  app.forEach(s => {
    if (!/^mcd/.test(s.id)) return;
    if (slugFix[s.id]) s.slug = slugFix[s.id];
    s.hasData = dataIds.has(s.id);
    s.totalSlots = slotsOf(s.id);
    if (logo64[s.id]) s.logo64 = logo64[s.id];
    s.color = MCD_GOLD;
    s.namePt = 'Coleção McDonald\'s ' + (String(s.releaseDate).slice(0, 4) || '');
    af++;
  });
  fs.writeFileSync(appPath, JSON.stringify(app), 'utf8');
  console.log('app: ' + af + ' entradas mcd atualizadas (hasData/slots/logo/cor/namePt)');
  console.log('OK — com dados agora: ' + [...dataIds].length);
})();
