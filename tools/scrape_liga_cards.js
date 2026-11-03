#!/usr/bin/env node
/* =============================================================================
 * scrape_liga_cards.js — Coleta TODAS as cartas de cada Pokémon na Liga Pokémon
 * (incl. promos e sets novos que a pokemontcg.io não tem) → liga_cards.json.
 * Imagens ficam no host repositorio.sbrauble.com (carregam mesmo na rede que
 * bloqueia *.pokemontcg.io). Salva progresso p/ resume. Throttle obrigatório.
 * Uso: node scrape_liga_cards.js [dexInicio] [dexFim]
 * ============================================================================= */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'liga_cards.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';
const START = parseInt(process.argv[2], 10) || 1;
const END = parseInt(process.argv[3], 10) || 1025;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchDex(dex) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch('https://www.ligapokemon.com.br/?view=pokedex/pokemon&id=' + dex, { headers: { 'User-Agent': UA } });
      if (r.ok) {
        const html = await r.text();
        const m = html.match(/let cardsjson = (\[[\s\S]*?\]);/);
        if (m) {
          const arr = JSON.parse(m[1]);
          return arr.map(x => ({
            id: 'liga-' + (x.IDE_CartaUnica || (x.sSigla + '-' + x.sNumber)),
            name: (x.sNomePortugues || x.sNomeIngles || '').replace(/\s*\(#.*$/, '').trim() || (x.sNomeIngles || ''),
            number: String(x.sNumber || ''),
            set_name: 'Liga · ' + (x.sSigla || ''),
            set_code: x.sSigla || '',
            image: x.sPathImage ? ('https://repositorio.sbrauble.com' + x.sPathImage) : '',
            priceLow: parseFloat(x.precoMenor) || 0,
            priceHigh: parseFloat(x.precoMaior) || 0
          })).filter(c => c.image);
        }
        return []; // página ok mas sem cardsjson (Pokémon sem cartas)
      }
    } catch (e) {}
    await sleep(1500 * (a + 1)); // backoff (provável rate-limit)
  }
  return null; // falhou de vez
}

(async () => {
  let data = {};
  if (fs.existsSync(OUT)) { try { data = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {} }
  let ok = 0, empty = 0, fail = 0, cards = 0;
  for (let dex = START; dex <= END; dex++) {
    if (data[dex] !== undefined) continue; // resume: já feito
    const res = await fetchDex(dex);
    if (res === null) { fail++; }
    else { data[dex] = res; if (res.length) { ok++; cards += res.length; } else empty++; }
    await sleep(650); // throttle entre Pokémon
    if (dex % 25 === 0) { fs.writeFileSync(OUT, JSON.stringify(data)); process.stdout.write('  dex ' + dex + '/' + END + ' | com cartas: ' + ok + ' | vazios: ' + empty + ' | falhas: ' + fail + ' | cartas: ' + cards + '\r'); }
  }
  fs.writeFileSync(OUT, JSON.stringify(data));
  console.log('\nConcluído. Pokémon com cartas: ' + ok + ' | cartas totais: ' + cards + ' | ' + (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB');
})();
