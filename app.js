/* plant-leaf-doctor — wire leaf-core to canvas + UI + log */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const LS='leaf-log-v1';
function esc(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function setStatus(t,err){$('status').textContent=t;$('status').classList.toggle('err',!!err)}
const MAPCOL={green:[47,158,68],yellow:[232,197,71],brown:[139,90,43],dark:[70,45,30],other:[240,240,236]};

async function analyzeCanvas(srcCanvas){
  // cap size for speed
  const maxW=640;
  const scale=Math.min(1,maxW/srcCanvas.width);
  const w=Math.max(1,Math.round(srcCanvas.width*scale)),h=Math.max(1,Math.round(srcCanvas.height*scale));
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d');ctx.drawImage(srcCanvas,0,0,w,h);
  const img=ctx.getImageData(0,0,w,h);
  const m=LeafCore.analyze(img);
  // paint damage map
  const map=$('c-map');map.width=w;map.height=h;
  const mctx=map.getContext('2d');
  const out=mctx.createImageData(w,h);
  for(let i=0;i<w*h;i++){
    const cls=LeafCore.classifyPixel(img.data[i*4],img.data[i*4+1],img.data[i*4+2]);
    const col=MAPCOL[cls];
    out.data[i*4]=col[0];out.data[i*4+1]=col[1];out.data[i*4+2]=col[2];out.data[i*4+3]=255;
  }
  mctx.putImageData(out,0,0);
  return m;
}
function render(m){
  $('score').textContent=m.healthScore;
  const C=2*Math.PI*52;
  $('ring-fg').style.strokeDashoffset=C*(1-m.healthScore/100);
  $('ring-fg').style.stroke=m.healthScore>=70?'var(--accent)':m.healthScore>=45?'#d97706':'#b91c1c';
  $('m-green').textContent=m.greenPct+'%';
  $('m-yellow').textContent=m.yellowPct+'%';
  $('m-brown').textContent=m.brownPct+'%';
  $('m-spots').textContent=m.spotCount;
  $('tips').innerHTML=LeafCore.guidance(m).map(t=>`<li>${esc(t)}</li>`).join('');
  $('result').classList.remove('hidden');
}
async function handleFile(file){
  if(!file)return;
  setStatus('Loading image…');
  const bmp=await createImageBitmap(file).catch(()=>null);
  if(!bmp){setStatus('Could not read that image.',1);return}
  const co=$('c-orig');co.width=bmp.width;co.height=bmp.height;
  co.getContext('2d').drawImage(bmp,0,0);
  $('stages').classList.remove('hidden');
  setStatus('Analyzing…');
  await new Promise(r=>setTimeout(r,30));
  const m=await analyzeCanvas(co);
  render(m);setStatus('Done.');
  addLog(m);
}
function addLog(m){
  let h=[];try{h=JSON.parse(localStorage.getItem(LS)||'[]')}catch(e){}
  h.unshift({score:m.healthScore,green:m.greenPct,yellow:m.yellowPct,brown:m.brownPct,spots:m.spotCount,at:Date.now()});
  h=h.slice(0,12);localStorage.setItem(LS,JSON.stringify(h));renderLog();
}
function renderLog(){
  let h=[];try{h=JSON.parse(localStorage.getItem(LS)||'[]')}catch(e){}
  $('log-list').innerHTML=h.length?h.map(x=>{
    const trend=x.score>=70?'🟢':x.score>=45?'🟠':'🔴';
    return `<div class="log-row"><span>${trend} <span class="mono">${x.score}</span> health</span><span class="hint">green ${x.green}% · yellow ${x.yellow}% · brown ${x.brown}% · ${x.spots} spots</span><span class="hint">${new Date(x.at).toLocaleString()}</span></div>`;
  }).join(''):'<p class="hint">No leaves checked yet.</p>';
  $('clear-log').classList.toggle('hidden',!h.length);
}
document.addEventListener('DOMContentLoaded',()=>{
  const drop=$('drop');
  drop.onclick=()=>$('file').click();
  drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')$('file').click()};
  $('file').onchange=e=>handleFile(e.target.files[0]);
  ['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over')}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over')}));
  drop.addEventListener('drop',e=>handleFile(e.dataTransfer.files[0]));
  $('clear-log').onclick=()=>{localStorage.setItem(LS,'[]');renderLog()};
  renderLog();
  // test hook: analyze a canvas painted by the test
  window.__leafTest=async paintFn=>{
    const c=document.createElement('canvas');c.width=300;c.height=300;
    paintFn(c.getContext('2d'),300,300);
    const m=await analyzeCanvas(c);
    render(m);addLog(m);
    return m;
  };
});
})();
