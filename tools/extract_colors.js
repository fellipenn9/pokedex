#!/usr/bin/env node
/* Extrai a cor dominante de cada set (do logo64, senão do sym64) → campo `color`
 * no masterset/sets_index.json, p/ tematizar o fundo das telas por coleção. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const p = path.join(ROOT, 'masterset', 'sets_index.json');
const idx = JSON.parse(fs.readFileSync(p, 'utf8'));

function b64buf(d){ const m = /^data:[^;]+;base64,(.*)$/.exec(d || ''); return m ? Buffer.from(m[1], 'base64') : null; }
function hex(n){ return ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2); }
// puxa saturação/brilho pra cor virar um bom "glow" (evita cinza morto)
function punch(r, g, b){
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max - min < 22) return null; // quase cinza → descarta
  const f = 1.35; const avg = (r + g + b) / 3;
  r = avg + (r - avg) * f; g = avg + (g - avg) * f; b = avg + (b - avg) * f;
  // clareia um pouco
  const l = Math.max(r, g, b); if (l < 150) { const s = 150 / (l || 1); r *= s; g *= s; b *= s; }
  return '#' + hex(r) + hex(g) + hex(b);
}

// cores curadas por coleção (logos são quase monocromáticas → auto falha)
const CUR = {
  base1:'#e6b422', base2:'#3fb56a', base3:'#c08a3e', cel25:'#c774e6', cel25c:'#d4af37',
  dc1:'#e0533a', me01:'#33b56a', me02:'#8a5cff', me02pt5:'#f0932b', me03:'#26b6c9',
  me04:'#e0453f', me05:'#7a68ff', MEP:'#9aa7c7'
};
(async () => {
  let n = 0;
  for (const s of idx) {
    if (CUR[s.id]) { s.color = CUR[s.id]; n++; continue; }
    const buf = b64buf(s.logo64) || b64buf(s.sym64);
    if (!buf) continue;
    try {
      const { dominant } = await sharp(buf).resize(48, 48, { fit: 'inside' }).stats();
      const c = punch(dominant.r, dominant.g, dominant.b);
      if (c) { s.color = c; n++; }
    } catch (e) {}
  }
  fs.writeFileSync(p, JSON.stringify(idx), 'utf8');
  console.log('cores extraídas: ' + n + '/' + idx.length);
  console.log('amostra:', idx.filter(s => s.hasData).map(s => s.id + '=' + (s.color || '—')).join(' '));
})();
