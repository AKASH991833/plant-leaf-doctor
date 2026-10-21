/* leaf-core — pixel-level leaf health analysis (pure JS, node-testable) */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.LeafCore=factory();
})(typeof self!=='undefined'?self:this,function(){
'use strict';
// classify one pixel: 'green' | 'yellow' | 'brown' | 'dark' | 'other'
function classifyPixel(r,g,b){
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
  if(mx<60)return 'dark';
  if(g>r*1.08&&g>b*1.15&&g>80)return 'green';
  if(r>110&&g>100&&b<Math.min(r,g)*0.62&&Math.abs(r-g)<70)return 'yellow';
  if(r>g*1.12&&g>b*1.05&&r<170&&r>70)return 'brown';
  return 'other';
}
// analyze {data:Uint8ClampedArray,width,height} → metrics
function analyze(img){
  const {data,width:w,height:h}=img;
  const n=w*h;
  const counts={green:0,yellow:0,brown:0,dark:0,other:0};
  const cls=new Uint8Array(n); // 1=brown/dark candidate for spots, 2=green
  for(let i=0;i<n;i++){
    const c=classifyPixel(data[i*4],data[i*4+1],data[i*4+2]);
    counts[c]++;
    if(c==='brown'||c==='dark')cls[i]=1;
    else if(c==='green')cls[i]=2;
  }
  // connected components of damaged pixels (spot detection), 4-neighborhood, downsampled scan
  const seen=new Uint8Array(n);
  const spots=[];const stack=[];
  const step=w>600?2:1;
  for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){
    const i=y*w+x;
    if(cls[i]!==1||seen[i])continue;
    let size=0;stack.length=0;stack.push(i);seen[i]=1;
    while(stack.length){
      const j=stack.pop();size+=step*step;
      const jx=j%w,jy=(j-jx)/w;
      const nb=[[jx+step,jy],[jx-step,jy],[jx,jy+step],[jx,jy-step]];
      for(const [nx,ny] of nb){
        if(nx<0||ny<0||nx>=w||ny>=h)continue;
        const k=ny*w+nx;
        if(cls[k]===1&&!seen[k]){seen[k]=1;stack.push(k)}
      }
    }
    if(size>=Math.max(24,n*0.0004))spots.push(size);
  }
  const damaged=counts.brown+counts.dark;
  const total=Math.max(1,n-counts.other);
  const greenPct=counts.green/n*100;
  const yellowPct=counts.yellow/n*100;
  const brownPct=counts.brown/n*100;
  const spotArea=spots.reduce((a,s)=>a+s,0)/n*100;
  // health score: reward green, penalize yellow/brown/spots
  let score=100;
  score-=Math.min(45,yellowPct*1.1);
  score-=Math.min(40,brownPct*1.6);
  score-=Math.min(15,spots.length*1.5);
  score=Math.max(0,Math.min(100,Math.round(score)));
  return{greenPct:+greenPct.toFixed(1),yellowPct:+yellowPct.toFixed(1),brownPct:+brownPct.toFixed(1),
    darkPct:+(counts.dark/n*100).toFixed(1),spotCount:spots.length,spotArea:+spotArea.toFixed(1),healthScore:score};
}
function guidance(m){
  const tips=[];
  if(m.healthScore>=85)tips.push('Leaf looks healthy — rich green coverage, minimal damage. Keep the current care routine.');
  if(m.yellowPct>15)tips.push('Noticeable yellowing (chlorosis). Common causes: overwatering, nitrogen deficiency, or low light. Check soil moisture before watering and consider a balanced fertilizer.');
  if(m.brownPct>8)tips.push('Brown patches detected — often scorch, underwatering, or fungal spots. Trim fully dead areas with clean scissors and review watering and sun exposure.');
  if(m.spotCount>=6)tips.push(`${m.spotCount} distinct spots found. Spreading spot patterns can indicate fungal or bacterial infection — isolate the plant, avoid wetting leaves, and remove the worst leaves.`);
  if(m.spotCount>=1&&m.spotCount<6&&m.brownPct>3)tips.push('A few damaged spots — monitor over the next week. If they multiply, treat as a possible infection.');
  if(m.greenPct<40)tips.push('Less than half the leaf reads as healthy green. If several leaves look like this, the plant likely needs intervention (light, water, nutrients — in that order of likelihood for indoor plants).');
  if(!tips.length)tips.push('Minor imperfections only. Normal wear is common on older leaves — no action needed unless it spreads.');
  return tips;
}
return{classifyPixel,analyze,guidance};
});
