#!/usr/bin/env node
/* =============================================================================
 * build_cameo_binder.js — Monta um fichário de APARIÇÕES/CAMEOS de um Pokémon
 * (cartas onde ele aparece na arte sem estar no nome), a partir da lista curada
 * da Cameo Pokémon Card Database (RotomAmiti). Resolve imagem/artista na
 * pokemontcg.io por nome+número, embute em base64 e gera um HTML standalone.
 * ============================================================================= */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// --- CONFIG: Pokémon-alvo + lista de cameos (da planilha, aba Gen correspondente) ---
const TARGET = { dex: 179, name: 'Mareep', emoji: '🐑', accent: '#f5b916' /* electric */ };
const CAMEOS = [
  { card: 'Double Gust',     set: 'Neo Genesis',     number: '100', note: '' },
  { card: 'Pokémon March',   set: 'Neo Genesis',     number: '102', note: '' },
  { card: 'Twins',           set: 'Triumphant',      number: '89',  note: '' },
  { card: 'Ampharos',        set: 'Chaos Rising',    number: '90',  note: '' },
  { card: 'Banette',         set: 'Ascended Heroes', number: '234', note: 'ornamento' },
  { card: 'Tropical Present', set: 'Miscellaneous Promos', number: '', note: 'Jumbo' }
];

async function jget(url, tries = 5) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': 'CameoBinder/1.0' } }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { last = e; await new Promise(res => setTimeout(res, 700 * (i + 1))); }
  }
  throw last;
}
async function toDataUri(url) {
  try { const r = await fetch(url); if (!r.ok) return ''; const b = Buffer.from(await r.arrayBuffer());
    const m = /\.webp/i.test(url) ? 'image/webp' : /\.jpe?g/i.test(url) ? 'image/jpeg' : 'image/png';
    return 'data:' + m + ';base64,' + b.toString('base64'); } catch (e) { return ''; }
}
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

(async () => {
  console.log('Fichário de aparições — ' + TARGET.name + ' (#' + TARGET.dex + ')');
  const rows = [];
  for (const c of CAMEOS) {
    let q = 'name:"' + c.card + '"'; if (c.number) q += ' number:' + c.number;
    let hit = null;
    try { const j = await jget('https://api.pokemontcg.io/v2/cards?q=' + encodeURIComponent(q) + '&select=id,name,number,rarity,artist,set,images&pageSize=10'); hit = (j.data || [])[0]; } catch (e) {}
    const imgUrl = hit && hit.images ? (hit.images.large || hit.images.small) : '';
    rows.push({
      card: c.card, set: (hit && hit.set && hit.set.name) || c.set, number: (hit && hit.number) || c.number,
      artist: (hit && hit.artist) || '', rarity: (hit && hit.rarity) || '', note: c.note,
      img: imgUrl ? await toDataUri(imgUrl) : ''
    });
    console.log('  ' + c.card + ' → ' + (imgUrl ? 'img ok' : 'sem imagem') + (hit ? ' [' + (hit.artist || '?') + ']' : ' [não achado]'));
    await new Promise(r => setTimeout(r, 200));
  }

  const cardsHtml = rows.map((r, i) => {
    const img = r.img ? `<img loading="lazy" src="${r.img}" alt="">` : `<div class="na"><span>🃏</span>sem imagem<br>disponível</div>`;
    const meta = [r.set, r.number ? '#' + r.number : ''].filter(Boolean).join(' · ');
    const chips = [r.rarity ? `<span class="chip">${esc(r.rarity)}</span>` : '', r.note ? `<span class="chip note">${esc(r.note)}</span>` : ''].join('');
    return `<div class="cc" data-i="${i}">
      <div class="cc-img"><span class="pg">#${i + 1}</span>${img}<span class="cameo">⚡ ${esc(TARGET.name)} na arte</span></div>
      <div class="cc-b">
        <div class="cc-name">${esc(r.card)}</div>
        <div class="cc-set">${esc(meta)}</div>
        ${r.artist ? `<div class="cc-art">🎨 ${esc(r.artist)}</div>` : ''}
        <div class="cc-chips">${chips}</div>
        <button class="own">Registrar</button>
      </div></div>`;
  }).join('');

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Fichário — ${esc(TARGET.name)} (aparições)</title>
<style>
:root{--accent:${TARGET.accent};--bg-dark:#1a1a2e;--bg-card:#16213e;--gold:#ffd700;--green:#00c853;--blue:#448aff;--gray:#555;--text:#eee;--text-dim:#aaa;--radius:8px}
*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg-dark);color:var(--text);min-height:100vh}
.wrap{max-width:1100px;margin:0 auto;padding:0 20px 60px}
header{padding:28px 20px 6px;text-align:center}
.eyebrow{font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);font-weight:800}
h1{margin:.3rem 0 .1rem;font-size:2rem;font-weight:800}.dex{color:var(--text-dim);font-weight:700;font-size:.95rem;background:rgba(255,255,255,.06);border:1px solid var(--gray);padding:2px 10px;border-radius:99px;margin-left:8px}
.sub{color:var(--text-dim);font-size:.9rem;margin-top:6px;max-width:640px;margin-left:auto;margin-right:auto;line-height:1.4}
.pbar{max-width:560px;margin:20px auto 4px;background:var(--bg-card);border:1px solid rgba(255,215,0,.25);border-radius:16px;padding:16px 20px}
.pbar .lbl{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}.pbar b{font-size:1rem}.pct{font-size:1.6rem;font-weight:800;color:var(--green)}
.track{height:12px;background:rgba(255,255,255,.1);border-radius:10px;overflow:hidden}.fill{height:100%;background:linear-gradient(90deg,var(--green),var(--gold));border-radius:10px;transition:width .4s}
.cnt{font-size:.82rem;color:var(--text-dim);margin-top:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:20px}
.cc{background:var(--bg-card);border:1px solid #2a3a55;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:transform .12s,border-color .12s,box-shadow .12s}
.cc:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.45)}
.cc.owned{border-color:var(--gold);box-shadow:0 0 0 1px rgba(255,215,0,.35)}
.cc.owned .cc-img::after{content:'✓';position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:50%;background:var(--gold);color:#3a2e00;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.5)}
.cc-img{position:relative;aspect-ratio:.72;background:#0f1830 center/contain no-repeat;display:flex;align-items:center;justify-content:center}
.cc-img img{width:100%;height:100%;object-fit:contain}
.cc-img .na{display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;color:var(--text-dim);font-size:.72rem;text-align:center;height:100%}.cc-img .na span{font-size:1.7rem;opacity:.45}
.pg{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.62);color:#fff;font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:99px;z-index:1}
.cameo{position:absolute;bottom:8px;left:8px;right:8px;background:rgba(245,185,22,.92);color:#2a2000;font-size:.66rem;font-weight:800;padding:3px 8px;border-radius:8px;text-align:center}
.cc-b{padding:11px 12px 12px;display:flex;flex-direction:column;gap:6px;flex:1}
.cc-name{font-weight:800;font-size:.95rem}.cc-set{color:var(--text-dim);font-size:.78rem}.cc-art{color:#9ec3ff;font-size:.74rem}
.cc-chips{display:flex;flex-wrap:wrap;gap:4px}.chip{font-size:.64rem;padding:2px 8px;border-radius:99px;background:rgba(255,255,255,.06);border:1px solid var(--gray);color:var(--text-dim);font-weight:600}.chip.note{color:var(--accent);border-color:rgba(245,185,22,.4)}
.own{margin-top:auto;width:100%;border:1px solid var(--gray);background:rgba(255,255,255,.06);color:var(--text-dim);border-radius:8px;padding:8px;font-size:.78rem;font-weight:800;cursor:pointer;transition:all .12s}
.cc:hover .own{border-color:var(--gold);color:var(--gold)}.own.on{background:linear-gradient(90deg,var(--green),var(--gold));border-color:transparent;color:#10240f}
</style></head><body>
<header>
  <div class="eyebrow">Fichário · Aparições (cameos)</div>
  <h1>${TARGET.emoji} ${esc(TARGET.name)} <span class="dex">#${TARGET.dex}</span></h1>
  <div class="sub">Cartas em que o ${esc(TARGET.name)} aparece na arte <b>sem estar no nome</b> — fonte: Cameo Pokémon Card Database (RotomAmiti).</div>
</header>
<div class="wrap">
  <div class="pbar"><div class="lbl"><b>Registradas</b><span class="pct" id="pct">0%</span></div>
    <div class="track"><div class="fill" id="fill" style="width:0"></div></div>
    <div class="cnt" id="cnt">0 de ${rows.length}</div></div>
  <div class="grid" id="grid">${cardsHtml}</div>
</div>
<script>
const LS='cameo_${TARGET.dex}_v1'; let owned=new Set(); try{const a=JSON.parse(localStorage.getItem(LS)); if(Array.isArray(a))owned=new Set(a);}catch(e){}
const TOTAL=${rows.length};
function upd(){ const n=owned.size, p=TOTAL?Math.round(n/TOTAL*100):0; document.getElementById('pct').textContent=p+'%'; document.getElementById('fill').style.width=p+'%'; document.getElementById('cnt').textContent=n+' de '+TOTAL; }
document.querySelectorAll('.cc').forEach(el=>{ const i=el.dataset.i; if(owned.has(i)){el.classList.add('owned'); const b=el.querySelector('.own'); b.classList.add('on'); b.textContent='✓ Registrada';}
  el.addEventListener('click',()=>{ const b=el.querySelector('.own'); if(owned.has(i)){owned.delete(i);el.classList.remove('owned');b.classList.remove('on');b.textContent='Registrar';} else {owned.add(i);el.classList.add('owned');b.classList.add('on');b.textContent='✓ Registrada';} localStorage.setItem(LS,JSON.stringify([...owned])); upd(); }); });
upd();
</script></body></html>`;

  const out = path.join(ROOT, 'fichario_cameo_' + TARGET.name.toLowerCase() + '.html');
  fs.writeFileSync(out, html, 'utf8');
  console.log('Gerado: ' + out + ' (' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB) | ' + rows.filter(r => r.img).length + '/' + rows.length + ' com imagem');
})();
