#!/usr/bin/env node
/* Monta sets_index.json = todos os sets do pkmn.gg (todas as séries), p/ o
 * navegador/favoritos do app. Uso: node build_sets_index.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';
const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function jget(url, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { last = e; await new Promise(res => setTimeout(res, 700 * (i + 1))); }
  }
  throw last;
}

(async () => {
  const series = (await jget('https://api.tcg.gg/pkmn/v1/series')).value || [];
  console.log('séries: ' + series.length);
  const out = [];
  for (const s of series) {
    try {
      const sets = (await jget(`https://api.tcg.gg/pkmn/v1/series/${s.id}/sets`)).value || [];
      for (const st of sets) out.push({
        id: st.id, name: st.name, slug: slugify(st.name), series: s.id, seriesName: s.name,
        category: st.category || '', total: st.total || 0, printedTotal: st.printedTotal || 0,
        releaseDate: st.releaseDate || '', symbol: st.symbol || '', logo: st.logo || ''
      });
    } catch (e) { console.log('  falhou série ' + s.id); }
    await new Promise(r => setTimeout(r, 350));
  }
  fs.writeFileSync(path.join(ROOT, 'sets_index.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log('sets totais: ' + out.length + ' → sets_index.json');

  // mapear as coleções do usuário
  const targets = ['base','fossil','jungle','celebrations','mcdonald','double crisis','crise','phantasmal','mega evolution','perfect order','ascended','chaos rising','pitch black'];
  console.log('\n=== possíveis correspondências das suas coleções ===');
  for (const t of targets) {
    const hits = out.filter(x => x.name.toLowerCase().includes(t) || x.series.includes(t));
    console.log('[' + t + '] ' + hits.map(h => h.name + ' (' + h.series + '/' + h.slug + ' · ' + h.total + ')').join('  |  '));
  }
})();
