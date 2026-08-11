#!/usr/bin/env node
/* =============================================================================
 * build_set_tracker.js — Rastreador de MASTER SET por coleção, com variações,
 * usando dados do pkmn.gg (api.tcg.gg). Baixa imagens em base64 e gera HTML.
 * Uso: node build_set_tracker.js <serie> <setSlug> [setId]
 * ============================================================================= */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const SERIES = process.argv[2] || 'mega-evolution';
const SLUG = process.argv[3] || 'ascended-heroes';
const SETID = process.argv[4] || '';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';

// Variações consideradas (carimbos ficam de fora por decisão do usuário).
// grp agrupa os padrões de bola sob um único filtro/resumo "Poké Ball (todas)".
const VAR = {
  normal:            { lbl: 'Normal',            short: 'Normal',  cls: 'v-normal', grp: 'normal' },
  holofoil:          { lbl: 'Holo',              short: 'Holo',    cls: 'v-holo',   grp: 'holofoil' },
  reverseHolofoil:   { lbl: 'Reverse Holo',      short: 'Reverse', cls: 'v-rev',    grp: 'reverseHolofoil' },
  energyPattern:     { lbl: 'Reverse · Energia', short: 'Energia', cls: 'v-rev',    grp: 'energyPattern' },
  pokeballPattern:   { lbl: 'Poké Ball',         short: 'Poké Ball', cls: 'v-ball', grp: 'ball' },
  duskballPattern:   { lbl: 'Dusk Ball',         short: 'Dusk',    cls: 'v-ball',   grp: 'ball' },
  loveBallPattern:   { lbl: 'Love Ball',         short: 'Love',    cls: 'v-ball',   grp: 'ball' },
  friendballPattern: { lbl: 'Friend Ball',       short: 'Friend',  cls: 'v-ball',   grp: 'ball' },
  quickballPattern:  { lbl: 'Quick Ball',        short: 'Quick',   cls: 'v-ball',   grp: 'ball' },
  rocketPattern:     { lbl: 'Rocket',            short: 'Rocket',  cls: 'v-ball',   grp: 'ball' }
};
const VORDER = Object.keys(VAR); // stamps NÃO entram

async function jget(url, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { last = e; await new Promise(res => setTimeout(res, 800 * (i + 1))); }
  }
  throw last;
}
async function toDataUri(url) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) return ''; const b = Buffer.from(await r.arrayBuffer());
    const m = /webp/i.test(url) ? 'image/webp' : /\.jpe?g/i.test(url) ? 'image/jpeg' : 'image/png'; return 'data:' + m + ';base64,' + b.toString('base64'); } catch (e) { return ''; }
}
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

(async () => {
  const sets = (await jget(`https://api.tcg.gg/pkmn/v1/series/${SERIES}/sets`)).value || [];
  const meta = sets.find(s => s.id === SETID) || sets.find(s => s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === SLUG) || {};
  console.log('Set: ' + (meta.name || SLUG));
  const cards = (await jget(`https://api.tcg.gg/pkmn/v1/series/${SERIES}/${SLUG}/cards`)).value || [];
  console.log('cartas: ' + cards.length);

  const rows = cards.map(c => ({
    id: c.id, number: c.numberDisplay || c.number, name: c.name, rarity: c.rarity || '', artist: c.artist || '',
    variants: VORDER.filter(k => c.variantMap && c.variantMap[k]),
    imgUrl: c.thumbImageUrl || c.largeImageUrl || '', img: ''
  }));
  let ok = 0;
  for (let i = 0; i < rows.length; i += 6) {
    const batch = rows.slice(i, i + 6);
    const res = await Promise.all(batch.map(r => r.imgUrl ? toDataUri(r.imgUrl) : Promise.resolve('')));
    batch.forEach((r, j) => { r.img = res[j]; if (res[j]) ok++; delete r.imgUrl; });
    process.stdout.write('  imagens ' + Math.min(i + 6, rows.length) + '/' + rows.length + '\r');
  }
  const totalSlots = rows.reduce((s, r) => s + r.variants.length, 0);
  console.log('\nimagens ok: ' + ok + '/' + rows.length + ' | slots: ' + totalSlots);

  const DATA = { setId: meta.id || SETID || SLUG, setName: meta.name || SLUG, total: meta.total || rows.length, printedTotal: meta.printedTotal || 0, totalSlots, rows };

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Master Set — ${esc(DATA.setName)}</title>
<style>
:root{--bg-dark:#1a1a2e;--bg-card:#16213e;--accent:#e94560;--gold:#ffd700;--green:#00c853;--blue:#448aff;--gray:#555;--text:#eee;--text-dim:#aaa;--radius:8px}
*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg-dark);color:var(--text);min-height:100vh;-webkit-tap-highlight-color:transparent}
.wrap{max-width:1320px;margin:0 auto;padding:0 16px 70px}
header{padding:22px 16px 4px;text-align:center}
.eyebrow{font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);font-weight:800}
h1{margin:.25rem 0 .1rem;font-size:1.7rem;font-weight:800}.sub{color:var(--text-dim);font-size:.84rem}
.hero{background:linear-gradient(135deg,rgba(233,69,96,.12),rgba(255,215,0,.08)),var(--bg-card);border:1px solid rgba(255,215,0,.25);border-radius:16px;padding:16px 18px;margin:16px 0 12px;position:sticky;top:0;z-index:10}
.hero-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
.hero-count{font-size:1.7rem;font-weight:800}.hero-count small{font-size:.78rem;color:var(--text-dim);font-weight:500}
.hero-pct{font-size:1.4rem;font-weight:800;color:var(--green)}
.bar{height:11px;background:rgba(255,255,255,.1);border-radius:10px;overflow:hidden;margin-top:9px}.fill{height:100%;background:linear-gradient(90deg,var(--green),var(--gold));transition:width .4s}
.vsum{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}
.vsum .vc{font-size:.68rem;padding:3px 9px;border-radius:99px;background:rgba(255,255,255,.05);border:1px solid var(--gray);color:var(--text-dim)}
.vsum .vc b{color:var(--text)}
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.filters input,.filters select{padding:9px 12px;border:1px solid var(--gray);border-radius:var(--radius);background:var(--bg-card);color:var(--text);font-size:.86rem}
.filters input{flex:1;min-width:150px}
.btnc{padding:9px 13px;background:rgba(255,255,255,.1);color:#f66;border:1px solid rgba(255,100,100,.4);border-radius:var(--radius);font-size:.8rem;font-weight:600;cursor:pointer}
.count-line{color:var(--text-dim);font-size:.8rem;margin:2px 2px 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.c{background:var(--bg-card);border:1px solid #2a3a55;border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.c.done{border-color:var(--green);box-shadow:0 0 0 2px rgba(0,200,83,.4)}
.c-img{position:relative;aspect-ratio:.72;background:#0f1830 center/contain no-repeat;display:flex;align-items:center;justify-content:center}
.c-img img{width:100%;height:100%;object-fit:contain}.c-img .na{color:var(--text-dim);font-size:.72rem}
.c.done .c-img img{filter:none}.c:not(.done) .c-img img{filter:saturate(.9)}
.pg{position:absolute;top:6px;left:6px;background:rgba(0,0,0,.62);color:#fff;font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:99px}
.cprog{position:absolute;top:6px;right:6px;background:rgba(0,0,0,.62);color:#fff;font-size:.68rem;font-weight:800;padding:2px 8px;border-radius:99px}
.c.done .cprog{background:var(--green);color:#08240f}
.donebadge{display:none;position:absolute;bottom:6px;right:6px;background:var(--green);color:#08240f;font-size:.66rem;font-weight:800;padding:3px 9px;border-radius:99px;box-shadow:0 2px 8px rgba(0,0,0,.4)}
.c.done .donebadge{display:block}
.c-b{padding:10px 11px 12px;display:flex;flex-direction:column;gap:6px}
.c-name{font-weight:700;font-size:.9rem;line-height:1.15}.c-meta{color:var(--text-dim);font-size:.73rem}
.vlist{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.v{font-size:.72rem;font-weight:700;padding:7px 11px;border-radius:10px;cursor:pointer;border:1.5px solid var(--gray);background:rgba(255,255,255,.04);color:var(--text-dim);user-select:none;transition:all .1s;min-height:34px;display:inline-flex;align-items:center;gap:4px}
.v:active{transform:scale(.94)}
.v::before{content:'+';font-weight:800;opacity:.6}
.v.on::before{content:'✓';opacity:1}
.v.on{color:#0c1a10;border-color:transparent}
.v.on.v-normal{background:#b9c6da}.v.on.v-holo{background:var(--gold)}
.v.on.v-rev{background:#7fd0ff}.v.on.v-ball{background:#ff9ec4}
.empty{grid-column:1/-1;text-align:center;color:var(--text-dim);padding:50px}
@media(max-width:600px){
  h1{font-size:1.4rem}.hero{position:static}
  .grid{grid-template-columns:1fr 1fr;gap:10px}
  .v{font-size:.75rem;padding:8px 10px;min-height:38px}
  .c-name{font-size:.82rem}
}
@media(max-width:380px){.grid{grid-template-columns:1fr}}
</style></head><body>
<header>
  <div class="eyebrow">Master Set · Rastreador</div>
  <h1>${esc(DATA.setName)}</h1>
  <div class="sub">${DATA.printedTotal ? DATA.printedTotal + ' numeradas · ' : ''}${DATA.total} no total · ${DATA.totalSlots} variações a coletar</div>
</header>
<div class="wrap">
  <div class="hero">
    <div class="hero-top"><div class="hero-count"><span id="own">0</span> <small>/ ${DATA.totalSlots} variações</small></div><div class="hero-pct" id="pct">0%</div></div>
    <div class="bar"><div class="fill" id="fill" style="width:0"></div></div>
    <div class="vsum" id="vsum"></div>
  </div>
  <div class="filters">
    <input type="search" id="q" placeholder="Buscar carta ou número...">
    <select id="rar"><option value="">Todas raridades</option></select>
    <select id="vf">
      <option value="">Todas variações</option>
      <option value="normal">Normal</option>
      <option value="holofoil">Holo</option>
      <option value="reverseHolofoil">Reverse Holo</option>
      <option value="energyPattern">Reverse · Energia</option>
      <option value="__ball">Poké Ball (todas)</option>
    </select>
    <select id="st"><option value="">Todas</option><option value="miss">Incompletas</option><option value="done">Completas</option></select>
    <button class="btnc" id="clr">Limpar</button>
  </div>
  <div class="count-line" id="cl"></div>
  <div class="grid" id="grid"></div>
</div>
<script>
const DATA=${JSON.stringify(DATA)};
const VAR=${JSON.stringify(VAR)};
const BALL=Object.keys(VAR).filter(k=>VAR[k].grp==='ball');
const LS='mset_'+DATA.setId+'_v2';
let owned=new Set(); try{const a=JSON.parse(localStorage.getItem(LS)); if(Array.isArray(a))owned=new Set(a);}catch(e){}
function save(){ try{localStorage.setItem(LS,JSON.stringify([...owned]));}catch(e){} }
const sk=(id,v)=>id+'|'+v;
[...new Set(DATA.rows.map(r=>r.rarity))].filter(Boolean).sort().forEach(r=>{const o=document.createElement('option');o.value=r;o.textContent=r;document.getElementById('rar').appendChild(o);});

const F={q:'',rar:'',vf:'',st:''};
const bind=(id,k)=>document.getElementById(id).addEventListener(id==='q'?'input':'change',e=>{F[k]=e.target.value;render();});
bind('q','q');bind('rar','rar');bind('vf','vf');bind('st','st');
document.getElementById('clr').onclick=()=>{Object.assign(F,{q:'',rar:'',vf:'',st:''});['q','rar','vf','st'].forEach(i=>document.getElementById(i).value='');render();};
function cardVarsMatchFilter(r){ if(!F.vf)return true; if(F.vf==='__ball')return r.variants.some(v=>VAR[v].grp==='ball'); return r.variants.includes(F.vf); }
function cardDone(r){ return r.variants.every(v=>owned.has(sk(r.id,v))); }
function cardOwnedN(r){ return r.variants.filter(v=>owned.has(sk(r.id,v))).length; }

function updateHero(){
  const p=DATA.totalSlots?Math.round(owned.size/DATA.totalSlots*100):0;
  document.getElementById('own').textContent=owned.size; document.getElementById('pct').textContent=p+'%'; document.getElementById('fill').style.width=p+'%';
  // resumo agrupado: normal, holo, reverse, energia, Poké Ball (todas)
  const buckets=[['normal','Normal'],['holofoil','Holo'],['reverseHolofoil','Reverse'],['energyPattern','Reverse·Energia'],['ball','Poké Ball (todas)']];
  const tot={},own={};
  DATA.rows.forEach(r=>r.variants.forEach(v=>{const g=VAR[v].grp; tot[g]=(tot[g]||0)+1; if(owned.has(sk(r.id,v)))own[g]=(own[g]||0)+1;}));
  document.getElementById('vsum').innerHTML=buckets.filter(b=>tot[b[0]]).map(b=>'<span class="vc">'+b[1]+': <b>'+(own[b[0]]||0)+'</b>/'+tot[b[0]]+'</span>').join('');
}
function render(){
  const g=document.getElementById('grid');
  let list=DATA.rows.filter(r=>{
    if(F.rar&&r.rarity!==F.rar)return false;
    if(!cardVarsMatchFilter(r))return false;
    if(F.st==='done'&&!cardDone(r))return false;
    if(F.st==='miss'&&cardDone(r))return false;
    if(F.q){const h=(r.name+' '+r.number).toLowerCase(); if(!h.includes(F.q.toLowerCase()))return false;}
    return true;
  });
  document.getElementById('cl').textContent=list.length+' de '+DATA.rows.length+' cartas';
  if(!list.length){g.innerHTML='<div class="empty">Nada com esses filtros.</div>';updateHero();return;}
  g.innerHTML=list.map(r=>{
    const img=r.img?'<img loading="lazy" src="'+r.img+'" alt="">':'<div class="na">sem imagem</div>';
    const vs=r.variants.map(v=>{const on=owned.has(sk(r.id,v));const m=VAR[v];return '<span class="v '+m.cls+(on?' on':'')+'" data-id="'+r.id+'" data-v="'+v+'" title="'+m.lbl+'">'+m.short+'</span>';}).join('');
    return '<div class="c'+(cardDone(r)?' done':'')+'" data-id="'+r.id+'"><div class="c-img"><span class="pg">'+r.number+'</span><span class="cprog">'+cardOwnedN(r)+'/'+r.variants.length+'</span><span class="donebadge">✓ Completa</span>'+img+'</div><div class="c-b"><div class="c-name">'+r.name+'</div><div class="c-meta">'+r.rarity+(r.artist?' · '+r.artist:'')+'</div><div class="vlist">'+vs+'</div></div></div>';
  }).join('');
  g.querySelectorAll('.v').forEach(el=>el.addEventListener('click',ev=>{
    ev.stopPropagation();
    const k=sk(el.dataset.id,el.dataset.v);
    if(owned.has(k))owned.delete(k);else owned.add(k);
    save(); el.classList.toggle('on');
    const card=el.closest('.c'); const r=DATA.rows.find(x=>x.id===el.dataset.id);
    card.classList.toggle('done',cardDone(r)); card.querySelector('.cprog').textContent=cardOwnedN(r)+'/'+r.variants.length;
    updateHero(); if(F.st)render();
  }));
}
updateHero();render();
</script></body></html>`;

  const out = path.join(ROOT, 'masterset_set_' + (DATA.setId || SLUG) + '.html');
  fs.writeFileSync(out, html, 'utf8');
  console.log('Gerado: ' + out + ' (' + (fs.statSync(out).size / 1048576).toFixed(1) + ' MB)');
})();
