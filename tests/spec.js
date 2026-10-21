module.exports=async(page)=>{
  const m=await page.evaluate(async()=>{
    // paint a synthetic leaf: green disc, 4 brown spots, one yellow patch, plain background
    return window.__leafTest((x,W,H)=>{
      x.fillStyle='rgb(240,240,235)';x.fillRect(0,0,W,H);
      x.fillStyle='rgb(40,140,55)';
      x.beginPath();x.ellipse(150,150,120,95,0.3,0,7);x.fill();
      x.fillStyle='rgb(200,190,60)';
      x.beginPath();x.ellipse(90,120,28,22,0,0,7);x.fill();
      x.fillStyle='rgb(110,70,35)';
      for(const [sx,sy] of[[190,100],[150,190],[220,180],[80,190]]){x.beginPath();x.arc(sx,sy,11,0,7);x.fill()}
    });
  });
  if(m.spotCount<3)throw new Error('spot detection failed: '+m.spotCount);
  if(m.greenPct<25)throw new Error('greenPct implausible: '+m.greenPct);
  if(!(m.healthScore>20&&m.healthScore<95))throw new Error('score implausible: '+m.healthScore);
  await page.waitForFunction(()=>document.querySelectorAll('#tips li').length>0,{timeout:5000});
  const tips=await page.$$eval('#tips li',e=>e.map(x=>x.textContent).join(' | '));
  const ring=await page.$eval('#ring-fg',e=>getComputedStyle(e).strokeDashoffset);
  const log=await page.$eval('#log-list',e=>e.textContent);
  if(!/health/.test(log))throw new Error('log not updated: '+log);
  return `analyzed synthetic leaf: score=${m.healthScore}, green=${m.greenPct}%, brown=${m.brownPct}%, spots=${m.spotCount}; ${tips.split('|').length} guidance tips; ring offset=${String(ring).slice(0,6)}; log row added`;
};
