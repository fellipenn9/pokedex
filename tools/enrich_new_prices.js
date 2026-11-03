#!/usr/bin/env node
/* =============================================================================
 * enrich_new_prices.js — Preenche liga_prices nas cartas SEM preço do
 * fullart_cards.json, usando a página do Pokédex da Liga (cardsjson traz
 * precoMenor/precoMaior por carta). Casa por número + similaridade de nome.
 * Uso: node enrich_new_prices.js
 * ============================================================================= */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FA = path.join(ROOT, 'fullart_cards.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

function hasPrice(c){ const p=c.liga_prices; if(!p||typeof p!=='object') return false; return Object.values(p).some(v=>v&&v.low>0); }
function norm(n){ return String(n||'').trim().replace(/^0+/,'').toUpperCase(); }
function tok(s){ return new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean)); }
function score(a,b){ const A=tok(a),B=tok(b); let n=0; A.forEach(t=>{ if(B.has(t)) n++; }); return n; }

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ligaCache = {};
async function getLiga(dex){
  if(ligaCache[dex]!==undefined) return ligaCache[dex];
  let list=[];
  for(let attempt=0; attempt<3; attempt++){
    try{
      const r=await fetch('https://www.ligapokemon.com.br/?view=pokedex/pokemon&id='+dex,{headers:{'User-Agent':UA}});
      if(r.ok){
        const html=await r.text();
        const m=html.match(/let cardsjson = (\[[\s\S]*?\]);/);
        if(m){ const arr=JSON.parse(m[1]); list=arr.map(x=>({num:String(x.sNumber||'').trim(),name:(x.sNomeIngles||x.sNomePortugues||''),low:parseFloat(x.precoMenor)||0,high:parseFloat(x.precoMaior)||0,setCode:x.sSigla||''})); break; }
      }
    }catch(e){}
    await sleep(1500*(attempt+1)); // backoff se vazio/erro (provável rate-limit)
  }
  await sleep(650); // throttle entre páginas distintas (evita bloqueio da Liga)
  return (ligaCache[dex]=list);
}

(async()=>{
  const data=JSON.parse(fs.readFileSync(FA,'utf8'));
  // index por id (cartas aparecem sob vários dex) + dex de referência
  const idCards={}, idDex={};
  for(const [dex,entry] of Object.entries(data.by_pokedex)){
    for(const c of entry.cards){ (idCards[c.id]=idCards[c.id]||[]).push(c); if(!idDex[c.id]) idDex[c.id]=dex; }
  }
  const unpriced=Object.keys(idCards).filter(id=>!idCards[id].some(hasPrice));
  const dexes=[...new Set(unpriced.map(id=>idDex[id]))];
  console.log('Cartas sem preço: '+unpriced.length+' em '+dexes.length+' Pokémon');

  let filled=0, nomatch=0, done=0;
  const today=new Date().toISOString().slice(0,16).replace('T',' ');
  for(const id of unpriced){
    const dex=idDex[id];
    const liga=await getLiga(dex);
    done++;
    if(done%50===0) process.stdout.write('  '+done+'/'+unpriced.length+' (preenchidas: '+filled+')\r');
    if(!liga.length){ nomatch++; continue; }
    const ref=idCards[id][0];
    const cands=liga.filter(l=>norm(l.num)===norm(ref.number) && l.high>0);
    if(!cands.length){ nomatch++; continue; }
    let best=cands[0],bs=-1; cands.forEach(c=>{const s=score(ref.name,c.name); if(s>bs){bs=s;best=c;}});
    const lp={'0':{low:best.low,mid:0,high:best.high}};
    idCards[id].forEach(c=>{ c.liga_prices=lp; c.liga_details=Object.assign({},c.liga_details||{},{set_code:best.setCode,stock_min:best.low,stock_max:best.high}); c.liga_scraped_at=today; });
    filled++;
  }
  console.log('\nPreenchidas: '+filled+' | sem correspondência na Liga: '+nomatch);
  // recomputa metadata.total mantém; só regrava
  fs.writeFileSync(FA,JSON.stringify(data,null,2),'utf8');
  console.log('Salvo. '+(fs.statSync(FA).size/1048576).toFixed(1)+' MB');
})();
