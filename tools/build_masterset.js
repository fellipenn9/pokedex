#!/usr/bin/env node
/* =============================================================================
 * P1 — Gerador de Master Set por Pokémon
 * Uso:  node build_masterset.js <dexId> [nomeOpcional]
 * Ex.:  node build_masterset.js 155
 *
 * O que faz (automatiza o que era feito à mão):
 *  - PokéAPI  -> nome + tipo (define o emoji do título)
 *  - pokemontcg.io (EN)  -> cartas + acabamentos derivados de tcgplayer.prices
 *  - TCGdex (pt, ja)     -> cartas multilíngues + detalhe de set (nome/total/data)
 *  - normaliza tudo no schema canônico (1 linha por variante)
 *  - baixa as imagens e embute em base64 (funciona offline / driblar bloqueio)
 *  - injeta no template e gera masterset_<slug>.html + masterset_<dex>.json
 *
 * Identidade da variante = idioma | set | número | variação | edição
 * ============================================================================= */
const fs = require('fs');
const path = require('path');

const DEX = parseInt(process.argv[2], 10);
if (!DEX) { console.error('Informe o dexId. Ex.: node build_masterset.js 155'); process.exit(1); }
const NAME_OVERRIDE = process.argv[3] || '';

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(__dirname, 'masterset_template.html');
const OUT_DIR = ROOT;

const TYPE_EMOJI = { normal:'⭐', fire:'🔥', water:'💧', grass:'🌿', electric:'⚡', ice:'❄️',
  fighting:'🥊', poison:'☠️', ground:'⛰️', flying:'🌬️', psychic:'🔮', bug:'🐛', rock:'🪨',
  ghost:'👻', dragon:'🐉', dark:'🌑', steel:'⚙️', fairy:'🧚' };

// cor de destaque por tipo (deixa cada página com a "vibe" do Pokémon)
const TYPE_ACCENT = { normal:'#9aa05a', fire:'#ff6a1a', water:'#2f8fff', grass:'#36b34a', electric:'#f5b916',
  ice:'#39c3d6', fighting:'#d63b3b', poison:'#a64dd6', ground:'#cf9d4e', flying:'#6aa6e6',
  psychic:'#ff5a8a', bug:'#8fc320', rock:'#b89647', ghost:'#7a5bd0', dragon:'#5a52e0', dark:'#5a5566', steel:'#5f8a9e', fairy:'#ff7fc4' };

// acabamento (chave tcgplayer.prices) -> [variação, edição]
const FINMAP = {
  normal:['Normal (Non-Holo)','N/A'], holofoil:['Holo','N/A'], reverseHolofoil:['Reverse Holo','N/A'],
  unlimited:['Normal (Non-Holo)','Unlimited'], '1stEdition':['Normal (Non-Holo)','1st Edition'],
  '1stEditionHolofoil':['Holo','1st Edition'], unlimitedHolofoil:['Holo','Unlimited'],
  holofoil1stEdition:['Holo','1st Edition']
};
const FIN_ORDER = { '1stEdition':0,'1stEditionHolofoil':1,unlimited:2,unlimitedHolofoil:3,normal:4,holofoil:5,reverseHolofoil:6 };

async function jget(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { last = e; await new Promise(r => setTimeout(r, 500 * (i + 1))); }
  }
  throw last;
}

async function getPokemonMeta(dex) {
  try {
    const p = await jget('https://pokeapi.co/api/v2/pokemon/' + dex);
    const name = NAME_OVERRIDE || (p.name ? p.name.charAt(0).toUpperCase() + p.name.slice(1) : ('#' + dex));
    const type = (p.types && p.types[0] && p.types[0].type && p.types[0].type.name) || 'normal';
    return { name, emoji: TYPE_EMOJI[type] || '✨', accent: TYPE_ACCENT[type] || '#ff6a1a' };
  } catch (e) { return { name: NAME_OVERRIDE || ('#' + dex), emoji: '✨', accent: '#ff6a1a' }; }
}

async function fetchEN(dex) {
  const url = 'https://api.pokemontcg.io/v2/cards?q=nationalPokedexNumbers:' + dex +
    '&select=id,name,number,rarity,set,images,tcgplayer&orderBy=set.releaseDate&pageSize=250';
  let data = [];
  try { data = (await jget(url)).data || []; } catch (e) { console.warn('EN falhou:', e.message); }
  const rows = [];
  for (const c of data) {
    const total = (c.set && (c.set.printedTotal || c.set.total)) || '';
    const disp = c.name + ' (' + c.number + (total ? '/' + total : '') + ')';
    const date = (c.set && c.set.releaseDate) || '';
    const img = (c.images && c.images.small) || '';
    let keys = (c.tcgplayer && c.tcgplayer.prices) ? Object.keys(c.tcgplayer.prices) : [];
    if (!keys.length) keys = ['normal'];
    keys.sort((a, b) => (FIN_ORDER[a] ?? 9) - (FIN_ORDER[b] ?? 9));
    const seen = new Set();
    for (const k of keys) {
      const m = FINMAP[k] || ['Normal (Non-Holo)', 'N/A'];
      const sig = m[0] + '|' + m[1];
      if (seen.has(sig)) continue; seen.add(sig);
      rows.push({ name: c.name, card: disp, set: c.set.name, language: 'English', variation: m[0], edition: m[1], date, img });
    }
  }
  return rows;
}

const setCache = {};
async function tcgSet(lang, sid) {
  const key = lang + '/' + sid;
  if (setCache[key] !== undefined) return setCache[key];
  let s = null;
  try { s = await jget('https://api.tcgdex.net/v2/' + lang + '/sets/' + sid); } catch (e) {}
  return (setCache[key] = s);
}
async function fetchTCGdex(dex, lang, label) {
  let list = [];
  try {
    list = await jget('https://api.tcgdex.net/v2/' + lang + '/cards?dexId=eq:' + dex +
      '&pagination:itemsPerPage=250&sort:field=name&sort:order=ASC');
  } catch (e) { console.warn(label + ' falhou:', e.message); return []; }
  const rows = [];
  for (const c of (Array.isArray(list) ? list : [])) {
    const sid = (c.id || '').split('-')[0];
    const s = await tcgSet(lang, sid);
    const sname = (s && s.name) || sid;
    const total = (s && s.cardCount && s.cardCount.official) || '';
    const date = (s && s.releaseDate) || '';
    const disp = c.name + ' (' + (c.localId || '') + (total ? '/' + total : '') + ')';
    const img = c.image ? (c.image + '/low.webp') : '';
    rows.push({ name: c.name, card: disp, set: sname, language: label, variation: 'Normal (Non-Holo)', edition: 'N/A', date, img });
  }
  return rows;
}

// LIGA POKÉMON — fonte de imagem/cobertura/preço. A página tem um JSON inline
// `let cardsjson = [...]` com TODAS as impressões (incl. promos JP) + sPathImage + preços.
async function fetchLiga(dex) {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
  let html;
  try {
    const r = await fetch('https://www.ligapokemon.com.br/?view=pokedex/pokemon&id=' + dex, { headers: { 'User-Agent': ua } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    html = await r.text();
  } catch (e) { console.warn('Liga falhou:', e.message); return []; }
  const m = html.match(/let cardsjson = (\[[\s\S]*?\]);/);
  if (!m) { console.warn('Liga: cardsjson não encontrado'); return []; }
  let arr; try { arr = JSON.parse(m[1]); } catch (e) { return []; }
  return arr.map(x => ({
    num: String(x.sNumber || '').trim(),
    name: (x.sNomeIngles || x.sNomePortugues || '').trim(),
    setCode: x.sSigla || '',
    img: x.sPathImage ? ('https://repositorio.sbrauble.com' + x.sPathImage) : '',
    priceLow: parseFloat(x.precoMenor) || 0, priceHigh: parseFloat(x.precoMaior) || 0
  })).filter(c => c.num);
}
function rowNum(r){ const m = (r.card || '').match(/\(#?([^/)]+)\//); return m ? m[1].trim() : ''; }
function tokenize(s){ return new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)); }
function nameScore(a, b){ const A = tokenize(a), B = tokenize(b); let n = 0; A.forEach(t => { if (B.has(t)) n++; }); return n; }

function mergeLiga(rows, liga) {
  if (!liga.length) return { filled: 0, added: 0, priced: 0 };
  const byNum = {};
  liga.forEach(c => { (byNum[c.num] = byNum[c.num] || []).push(c); });
  const used = new Set();
  let filled = 0, priced = 0;
  rows.forEach(r => {
    const cands = byNum[rowNum(r)] || [];
    if (!cands.length) return;
    let best = cands[0], bs = -1;
    cands.forEach(c => { const s = nameScore(r.card, c.name); if (s > bs) { bs = s; best = c; } });
    if (!r.img && best.img) { r.img = best.img; filled++; }
    if (best.priceHigh > 0) { r.priceLow = best.priceLow; r.priceHigh = best.priceHigh; priced++; }
    used.add(best);
  });
  let added = 0;
  liga.forEach(c => {
    if (used.has(c)) return; // já casou com uma das nossas linhas
    rows.push({ name: c.name, card: c.name, set: 'Liga · ' + c.setCode, language: 'Outro (Liga)',
      variation: 'Normal (Non-Holo)', edition: 'N/A', date: '', img: c.img, source: 'liga',
      priceLow: c.priceLow, priceHigh: c.priceHigh });
    added++;
  });
  return { filled, added, priced };
}

async function toDataUri(url) {
  try {
    const r = await fetch(url); if (!r.ok) return '';
    const buf = Buffer.from(await r.arrayBuffer());
    const mime = /\.webp/i.test(url) ? 'image/webp' : /\.jpe?g/i.test(url) ? 'image/jpeg' : 'image/png';
    return 'data:' + mime + ';base64,' + buf.toString('base64');
  } catch (e) { return ''; }
}

async function embedImages(rows) {
  const urls = [...new Set(rows.map(r => r.img).filter(Boolean))];
  const cache = {};
  let ok = 0, fail = 0;
  // baixa em lotes de 6
  for (let i = 0; i < urls.length; i += 6) {
    const batch = urls.slice(i, i + 6);
    const res = await Promise.all(batch.map(u => toDataUri(u)));
    batch.forEach((u, j) => { cache[u] = res[j]; res[j] ? ok++ : fail++; });
  }
  rows.forEach(r => { if (r.img) r.img = cache[r.img] || ''; });
  return { ok, fail, missing: rows.filter(r => !r.img).length };
}

function slugify(s){ return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

(async () => {
  console.log('== Master Set #' + DEX + ' ==');
  const meta = await getPokemonMeta(DEX);
  console.log('Pokémon:', meta.name, meta.emoji);

  const [en, pt, ja, liga] = await Promise.all([
    fetchEN(DEX),
    fetchTCGdex(DEX, 'pt', 'Portuguese (Brazil)'),
    fetchTCGdex(DEX, 'ja', 'Japanese'),
    fetchLiga(DEX)
  ]);
  let rows = [...en, ...pt, ...ja];
  console.log('Variantes base: EN=' + en.length + ' PT=' + pt.length + ' JA=' + ja.length + ' = ' + rows.length);
  const lg = mergeLiga(rows, liga);
  console.log('Liga: ' + liga.length + ' impressões → ' + lg.filled + ' imagens preenchidas, ' + lg.priced + ' com preço, ' + lg.added + ' novas (cobertura). Total agora: ' + rows.length);

  // salva o JSON canônico (URLs) ANTES de embutir base64 — é o dado p/ o app
  const slug = slugify(meta.name) || ('dex-' + DEX);
  fs.writeFileSync(path.join(OUT_DIR, 'masterset_' + DEX + '.json'),
    JSON.stringify({ dex: DEX, name: meta.name, emoji: meta.emoji, rows }, null, 2), 'utf8');

  console.log('Baixando imagens…');
  const stat = await embedImages(rows);
  console.log('Imagens: ok=' + stat.ok + ' falhou=' + stat.fail + ' sem imagem=' + stat.missing);

  const tpl = fs.readFileSync(TEMPLATE, 'utf8');
  const html = tpl
    .replaceAll('__POKENAME__', meta.name)
    .replaceAll('__EMOJI__', meta.emoji)
    .replaceAll('__DEX__', '#' + DEX)
    .replaceAll('__ACCENT__', meta.accent)
    .replaceAll('__LSKEY__', 'master_' + DEX + '_v2')
    .replace('__DATA__', JSON.stringify(rows));
  const outFile = path.join(OUT_DIR, 'masterset_' + slug + '.html');
  fs.writeFileSync(outFile, html, 'utf8');
  console.log('Gerado:', outFile, '(' + (fs.statSync(outFile).size / 1048576).toFixed(1) + ' MB)');
})();
