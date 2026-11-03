#!/usr/bin/env node
/* =============================================================================
 * refresh_fullart.js — Atualiza fullart_cards.json com as cartas mais recentes
 * da pokemontcg.io, PRESERVANDO o enrich de preços da Liga já existente (por id).
 * Nunca remove cartas (união por id). Uso: node refresh_fullart.js
 * ============================================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FA_PATH = path.join(ROOT, 'fullart_cards.json');
const PD_PATH = path.join(ROOT, 'pokedex_dados.json');
const API = 'https://api.pokemontcg.io/v2/cards';
const PAGE = 250;

// Raridades "full art / chase" — lista original + novas (Mega Evolution era 2026)
const RARITIES = [
  'Illustration Rare','Special Illustration Rare','Double Rare','Ultra Rare','Rare Ultra',
  'Rare Secret','Rare Rainbow','Hyper Rare','Mega Hyper Rare','MEGA_ATTACK_RARE',
  'Rare Holo VMAX','Rare Holo VSTAR','Rare Holo V','Rare Holo GX','Rare Holo EX',
  'ACE SPEC Rare','Shiny Ultra Rare','Shiny Rare','Rare Shiny','Rare Shiny GX',
  'Amazing Rare','Radiant Rare','Rare Holo Star','Trainer Gallery Rare Holo'
];

async function jget(url, tries = 5) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'FullArtRefresh/1.0' } });
      if (r.status === 429 || r.status >= 500) throw new Error('HTTP ' + r.status);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { last = e; await new Promise(res => setTimeout(res, 1500 * (i + 1))); }
  }
  throw last;
}

function ligaUrl(name) { return 'https://www.ligapokemon.com.br/?view=cards/search&card=nome%3D' + encodeURIComponent(name); }

(async () => {
  console.log('Carregando arquivos locais…');
  const pd = JSON.parse(fs.readFileSync(PD_PATH, 'utf8'));
  const nameByNum = {}; pd.forEach(p => { if (p.number <= 1025) nameByNum[p.number] = p.name; });
  const old = JSON.parse(fs.readFileSync(FA_PATH, 'utf8'));

  // index do enrich antigo por id (preserva preços) + dex keys onde cada id aparecia
  const oldById = {}; const oldDexById = {};
  for (const [dex, entry] of Object.entries(old.by_pokedex || {})) {
    for (const c of (entry.cards || [])) {
      oldById[c.id] = c;
      (oldDexById[c.id] = oldDexById[c.id] || new Set()).add(dex);
    }
  }
  console.log('  ' + Object.keys(oldById).length + ' cartas no arquivo atual (com preços a preservar)');

  // buscar todas as full art atuais
  const q = encodeURIComponent(RARITIES.map(r => 'rarity:"' + r + '"').join(' OR '));
  const sel = 'id,name,number,rarity,nationalPokedexNumbers,set,images';
  let page = 1, apiCards = [], totalPages = 1;
  console.log('Buscando cartas full art na pokemontcg.io…');
  do {
    const data = await jget(`${API}?q=${q}&select=${sel}&pageSize=${PAGE}&page=${page}&orderBy=-set.releaseDate`);
    if (page === 1) { totalPages = Math.ceil((data.totalCount || 0) / PAGE); console.log('  total na API: ' + data.totalCount + ' (' + totalPages + ' páginas)'); }
    (data.data || []).forEach(c => apiCards.push(c));
    process.stdout.write('  página ' + page + '/' + totalPages + ' — acumulado ' + apiCards.length + '\r');
    page++;
    if (page <= totalPages) await new Promise(r => setTimeout(r, 1200));
  } while (page <= totalPages);
  console.log('\n  ' + apiCards.length + ' cartas recebidas da API');

  // construir entrada (reusa enrich antigo p/ ids existentes; novo p/ ids inéditos)
  function buildEntry(c) {
    const ex = oldById[c.id];
    if (ex) return ex; // preserva preços/imagens/ed_code já enriquecidos
    return {
      id: c.id, name: c.name, number: c.number || '',
      set_id: (c.set && c.set.id) || '', set_name: (c.set && c.set.name) || '',
      rarity: c.rarity || '',
      image_small: (c.images && c.images.small) || '', image_large: (c.images && c.images.large) || '',
      liga_pokemon_url: ligaUrl(c.name),
      ed_code: (c.set && (c.set.ptcgoCode || c.set.id)) || ''
    };
  }

  const byPokedex = {}; let newCount = 0; const seen = new Set();
  for (const c of apiCards) {
    const nums = (c.nationalPokedexNumbers || []).filter(n => n <= 1025);
    if (!nums.length) continue;
    if (!oldById[c.id]) newCount++;
    const entry = buildEntry(c);
    for (const dex of nums) {
      const k = String(dex);
      if (!byPokedex[k]) byPokedex[k] = { pokemon: nameByNum[dex] || ('Pokemon #' + dex), cards: [] };
      byPokedex[k].cards.push(entry);
      seen.add(c.id);
    }
  }

  // nunca perder cartas: re-inserir ids do arquivo antigo que não vieram da API
  let kept = 0;
  for (const [id, c] of Object.entries(oldById)) {
    if (seen.has(id)) continue;
    for (const dex of (oldDexById[id] || [])) {
      const k = String(dex);
      if (!byPokedex[k]) byPokedex[k] = { pokemon: nameByNum[+dex] || ('Pokemon #' + dex), cards: [] };
      byPokedex[k].cards.push(c);
    }
    kept++;
  }

  const total = Object.values(byPokedex).reduce((s, e) => s + e.cards.length, 0);
  const rar = {}; Object.values(byPokedex).forEach(e => e.cards.forEach(c => { rar[c.rarity] = (rar[c.rarity] || 0) + 1; }));
  const out = {
    metadata: {
      total_cards: total, total_raw_from_api: apiCards.length,
      scraped_at: process.env.TODAY || new Date().toISOString().slice(0, 10),
      pokemon_with_fullart: Object.keys(byPokedex).length,
      rarity_breakdown: Object.fromEntries(Object.entries(rar).sort((a, b) => b[1] - a[1]))
    },
    by_pokedex: Object.fromEntries(Object.entries(byPokedex).sort((a, b) => +a[0] - +b[0]))
  };
  fs.writeFileSync(FA_PATH, JSON.stringify(out, null, 2), 'utf8');
  console.log('\n=== Resumo ===');
  console.log('  Pokémon com full art: ' + out.metadata.pokemon_with_fullart);
  console.log('  Cartas mapeadas: ' + total);
  console.log('  NOVAS cartas (não estavam no arquivo): ' + newCount);
  console.log('  Cartas antigas preservadas s/ match na API: ' + kept);
  console.log('  Arquivo: ' + (fs.statSync(FA_PATH).size / 1048576).toFixed(1) + ' MB');
})();
