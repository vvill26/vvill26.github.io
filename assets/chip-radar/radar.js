/* Inference-chip design-philosophy radar. Data: window.CHIPS = {axes, entities, groups, hetero, deployGroups} */
(function(){
const D = window.CHIPS;
const AXES = D.axes;                 // data order
const ORDER = ["compiler","cgra","vlsi","memory","network","tco","runtime","cpu","gpu","algorithm"]; // display order (clockwise from top)
const LABEL = {compiler:"Compiler",cgra:"CGRA / dataflow",vlsi:"VLSI / physical",memory:"Memory / package",network:"Network / distributed",tco:"Datacenter / TCO",runtime:"Runtime / serving",cpu:"CPU",gpu:"GPU",algorithm:"Algorithm"};
const SHORT = {compiler:"Compiler",cgra:"CGRA",vlsi:"VLSI",memory:"Memory",network:"Network",tco:"TCO",runtime:"Runtime",cpu:"CPU",gpu:"GPU",algorithm:"Algorithm"};
const idx = ORDER.map(a => AXES.indexOf(a));
const byId = {}; D.entities.forEach(e => byId[e.id] = e);
const SLOT = ["s1","s2","s3"];
const NS = "http://www.w3.org/2000/svg";
const el = (t,a={},p) => { const n=document.createElementNS(NS,t); for(const k in a) n.setAttribute(k,a[k]); if(p) p.appendChild(n); return n; };
const h = (t,a={},p,txt) => { const n=document.createElement(t); for(const k in a) n.setAttribute(k,a[k]); if(txt!=null) n.textContent=txt; if(p) p.appendChild(n); return n; };
const root = document.getElementById("chip-radar");
const tip = h("div",{class:"cr-tip",role:"status"},document.body);

function pts(scores, cx, cy, R){
  return ORDER.map((a,i)=>{ const v = scores[idx[i]]/5; const ang = -Math.PI/2 + i*2*Math.PI/ORDER.length;
    return [cx + R*v*Math.cos(ang), cy + R*v*Math.sin(ang)]; });
}
function frame(svg, cx, cy, R, labels){
  const g = el("g",{class:"cr-grid"},svg);
  [1,2,3,4,5].forEach(k=>{ const p = ORDER.map((a,i)=>{const ang=-Math.PI/2+i*2*Math.PI/ORDER.length; return [cx+R*k/5*Math.cos(ang), cy+R*k/5*Math.sin(ang)];});
    el("polygon",{points:p.map(q=>q.join(",")).join(" "),class:k===5?"cr-ring cr-ring-out":"cr-ring"},g); });
  ORDER.forEach((a,i)=>{ const ang=-Math.PI/2+i*2*Math.PI/ORDER.length;
    el("line",{x1:cx,y1:cy,x2:cx+R*Math.cos(ang),y2:cy+R*Math.sin(ang),class:"cr-spoke"},g);
    if(labels){ const lx=cx+(R+18)*Math.cos(ang), ly=cy+(R+18)*Math.sin(ang);
      const t=el("text",{x:lx,y:ly+4,class:"cr-axis","text-anchor": Math.abs(Math.cos(ang))<0.2?"middle":(Math.cos(ang)>0?"start":"end")},g); t.textContent = labels==="short"?SHORT[a]:LABEL[a]; }
  });
  if(labels==="long"){ [1,3,5].forEach(k=>{ const t=el("text",{x:cx+4,y:cy-R*k/5+12,class:"cr-tick"},g); t.textContent=k; }); }
}
function shape(svg, e, cx, cy, R, cls, opts={}){
  const p = pts(e.scores,cx,cy,R);
  const poly = el("polygon",{points:p.map(q=>q.join(",")).join(" "),class:"cr-shape "+cls},svg);
  if(opts.dots!==false) p.forEach((q,i)=>{ const c=el("circle",{cx:q[0],cy:q[1],r:opts.r||4,class:"cr-dot "+cls},svg);
      const hit=el("circle",{cx:q[0],cy:q[1],r:12,class:"cr-hit"},svg);
      const ai=idx[i]; const show=ev=>showTip(ev,e,ai); hit.addEventListener("mouseenter",show); hit.addEventListener("mousemove",show); hit.addEventListener("mouseleave",hideTip);
      hit.addEventListener("focus",show); hit.setAttribute("tabindex","0"); });
  return poly;
}
function showTip(ev,e,ai){
  const conf = e.conf?({H:"high",M:"medium",L:"low"}[e.conf[ai]]||""):"";
  tip.innerHTML = `<b>${e.name}</b><br><span class="cr-tk">${LABEL[AXES[ai]]}</span> <b>${e.scores[ai]}</b>/5${conf?` · ${conf} confidence`:""}${e.why&&e.why[ai]?`<div class="cr-tw">${e.why[ai]}</div>`:""}`;
  tip.style.display="block"; const x=(ev.clientX||0)+14, y=(ev.clientY||0)+14;
  tip.style.left=Math.min(x, window.innerWidth-300)+"px"; tip.style.top=y+"px";
}
function hideTip(){ tip.style.display="none"; }

/* ---------- layout ---------- */
root.innerHTML="";
const tabs = h("div",{class:"cr-tabs",role:"tablist"},root);
const views = {};
const MODES=[["compare","Compare"],["grid","All chips"],["tpu","TPU timeline"],["hetero","Heterogeneous"],["deploy","Cloud vs edge"],["table","Table"]];
MODES.forEach(([k,lab],i)=>{ const b=h("button",{class:"cr-tab",role:"tab","data-k":k},tabs,lab); b.onclick=()=>show(k); views[k]=h("div",{class:"cr-view","data-k":k},root); });
function show(k){ document.querySelectorAll(".cr-tab").forEach(b=>b.classList.toggle("on",b.dataset.k===k)); Object.entries(views).forEach(([kk,v])=>v.style.display=kk===k?"block":"none"); hideTip(); if(k==="tpu") drawTpu(); }

/* ---------- compare ---------- */
let sel = (D.defaultCompare||[]).slice(0,3);
const cmp = views.compare;
const cmpTop = h("div",{class:"cr-row"},cmp);
const big = el("svg",{viewBox:"-50 0 660 500",class:"cr-big",role:"img","aria-label":"Radar chart comparing selected chips"},cmpTop);
const side = h("div",{class:"cr-side"},cmpTop);
const pick = h("div",{class:"cr-pick"},cmp);
h("div",{class:"cr-hint"},pick,"Pick up to three chips to overlay. Hover a point for the score and the reason.");
D.groups.forEach(g=>{ const row=h("div",{class:"cr-grp"},pick); h("span",{class:"cr-gl"},row,g.name);
  g.ids.forEach(id=>{ const e=byId[id]; if(!e) return; const b=h("button",{class:"cr-chip","data-id":id},row,e.short||e.name); b.onclick=()=>toggle(id); }); });
function toggle(id){ const i=sel.indexOf(id); if(i>=0) sel.splice(i,1); else { if(sel.length>=3) sel.shift(); sel.push(id);} drawCompare(); }
function drawCompare(){
  big.innerHTML=""; frame(big,280,250,180,"long");
  sel.forEach((id,i)=>shape(big,byId[id],280,250,180,SLOT[i]));
  pick.querySelectorAll(".cr-chip").forEach(b=>{ const i=sel.indexOf(b.dataset.id); b.className="cr-chip"+(i>=0?" on "+SLOT[i]:""); });
  side.innerHTML="";
  if(!sel.length) h("p",{class:"cr-muted"},side,"Nothing selected.");
  sel.forEach((id,i)=>{ const e=byId[id]; const c=h("div",{class:"cr-card"},side);
    const t=h("div",{class:"cr-ct"},c); h("span",{class:"cr-sw "+SLOT[i]},t); h("b",{},t,e.name);
    h("div",{class:"cr-cm"},c,[e.vendor,e.year,e.deployLabel||e.deploy,e.roleLabel||e.role].filter(Boolean).join(" · "));
    if(e.one_liner) h("div",{class:"cr-co"},c,e.one_liner);
    const top=ORDER.map((a,k)=>[a,e.scores[idx[k]]]).sort((x,y)=>y[1]-x[1]).slice(0,3).map(x=>`${SHORT[x[0]]} ${x[1]}`).join(" · ");
    h("div",{class:"cr-cs"},c,"Strongest: "+top);
  });
}

/* ---------- grid ---------- */
const grid = views.grid;
h("div",{class:"cr-hint"},grid,"Every chip's fingerprint, grouped by design archetype. Click one to compare.");
(D.archetypes||[{name:"All",ids:D.entities.filter(e=>!e.hetero).map(e=>e.id)}]).forEach(ar=>{
  const sec=h("div",{class:"cr-arch"},grid); h("div",{class:"cr-an"},sec,ar.name); if(ar.desc) h("div",{class:"cr-ad"},sec,ar.desc);
  const wrap=h("div",{class:"cr-mini-wrap"},sec);
  ar.ids.forEach(id=>{ const e=byId[id]; if(!e) return; const cell=h("button",{class:"cr-mini","aria-label":e.name},wrap);
    const s=el("svg",{viewBox:"0 0 140 132"},cell); frame(s,70,66,46,false); shape(s,e,70,66,46,"s1",{dots:false});
    h("div",{class:"cr-mn"},cell,e.short||e.name); h("div",{class:"cr-my"},cell,String(e.year||""));
    cell.onclick=()=>{ sel=[id]; drawCompare(); show("compare"); window.scrollTo({top:root.getBoundingClientRect().top+window.scrollY-20,behavior:"smooth"}); };
  });
});

/* ---------- TPU timeline ---------- */
const tpuV = views.tpu; const tpuIds = D.tpuTimeline||[];
const tpuSvg = el("svg",{viewBox:"-50 0 660 500",class:"cr-big",role:"img","aria-label":"TPU generations radar"},tpuV);
const tpuCtl = h("div",{class:"cr-ctl"},tpuV);
const play = h("button",{class:"cr-btn"},tpuCtl,"▶ Play");
const slider = h("input",{type:"range",min:0,max:Math.max(0,tpuIds.length-1),step:1,value:0,class:"cr-range","aria-label":"TPU generation"},tpuCtl);
const tpuLab = h("div",{class:"cr-tl"},tpuV);
const ticks = h("div",{class:"cr-ticks"},tpuV); tpuIds.forEach((id,i)=>{ const b=h("button",{class:"cr-tk2"},ticks,(byId[id].short||byId[id].name).replace("TPU ","")); b.onclick=()=>{slider.value=i; drawTpu();}; });
let cur=null, anim=null, timer=null;
function lerp(a,b,t){ return a.map((v,i)=>v+(b[i]-v)*t); }
function drawTpuScores(sc, e){
  tpuSvg.innerHTML=""; frame(tpuSvg,280,250,180,"long");
  shape(tpuSvg,byId[tpuIds[0]],280,250,180,"ghost",{dots:false});
  shape(tpuSvg,{...e,scores:sc},280,250,180,"s1");
}
function drawTpu(){
  if(!tpuIds.length) return; const i=+slider.value; const e=byId[tpuIds[i]];
  ticks.querySelectorAll(".cr-tk2").forEach((b,k)=>b.classList.toggle("on",k===i));
  tpuLab.innerHTML=`<b>${e.name}</b> · ${e.year} · ${e.roleLabel||e.role}<br><span class="cr-muted">${e.one_liner||""}</span><br><span class="cr-muted">Dashed outline: TPU v1 (2015)</span>`;
  const from = cur||e.scores, to=e.scores; cancelAnimationFrame(anim); const t0=performance.now();
  const step=now=>{ const t=Math.min(1,(now-t0)/450); const k=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2; drawTpuScores(lerp(from,to,k),e); if(t<1) anim=requestAnimationFrame(step); else cur=to.slice(); };
  anim=requestAnimationFrame(step);
}
slider.oninput=drawTpu;
play.onclick=()=>{ if(timer){clearInterval(timer);timer=null;play.textContent="▶ Play";return;} play.textContent="❚❚ Pause"; if(+slider.value>=tpuIds.length-1) slider.value=0; drawTpu();
  timer=setInterval(()=>{ if(+slider.value>=tpuIds.length-1){clearInterval(timer);timer=null;play.textContent="▶ Play";return;} slider.value=+slider.value+1; drawTpu(); },1400); };

/* ---------- heterogeneous ---------- */
const het = views.hetero; let hsel = (D.hetero[0]||{}).id;
h("div",{class:"cr-hint"},het,"A heterogeneous system combines chips with different shapes. Filled: each component. Dashed: the system as deployed.");
const hpick = h("div",{class:"cr-grp"},het);
const hrow = h("div",{class:"cr-row"},het);
const hsvg = el("svg",{viewBox:"-50 0 660 500",class:"cr-big",role:"img","aria-label":"Heterogeneous system radar"},hrow);
const hside = h("div",{class:"cr-side"},hrow);
D.hetero.forEach(s=>{ const b=h("button",{class:"cr-chip","data-id":s.id},hpick,s.short||s.name); b.onclick=()=>{hsel=s.id; drawHet();}; });
function drawHet(){
  const s=D.hetero.find(x=>x.id===hsel); if(!s) return;
  hpick.querySelectorAll(".cr-chip").forEach(b=>b.classList.toggle("on",b.dataset.id===hsel));
  hsvg.innerHTML=""; frame(hsvg,280,250,180,"long");
  s.components.forEach((cid,i)=>shape(hsvg,byId[cid],280,250,180,SLOT[i]));
  shape(hsvg,byId[s.id],280,250,180,"sys");
  hside.innerHTML=""; s.components.forEach((cid,i)=>{ const e=byId[cid]; const c=h("div",{class:"cr-card"},hside); const t=h("div",{class:"cr-ct"},c); h("span",{class:"cr-sw "+SLOT[i]},t); h("b",{},t,e.name); h("div",{class:"cr-co"},c,(s.roles||[])[i]||""); });
  const c=h("div",{class:"cr-card"},hside); const t=h("div",{class:"cr-ct"},c); h("span",{class:"cr-sw sys"},t); h("b",{},t,"System as deployed"); h("div",{class:"cr-co"},c,s.note||"");
}

/* ---------- deployment ---------- */
const dep = views.deploy;
h("div",{class:"cr-hint"},dep,"Average shape per deployment scenario. Same axes, very different priorities.");
const drow=h("div",{class:"cr-row"},dep); const dsvg=el("svg",{viewBox:"-50 0 660 500",class:"cr-big",role:"img","aria-label":"Average radar by deployment"},drow); const dside=h("div",{class:"cr-side"},drow);
function drawDep(){ dsvg.innerHTML=""; frame(dsvg,280,250,180,"long");
  D.deployGroups.forEach((g,i)=>{ const ents=g.ids.map(id=>byId[id]).filter(Boolean); const avg=AXES.map((_,k)=>ents.reduce((s,e)=>s+e.scores[k],0)/ents.length);
    shape(dsvg,{name:g.name+" (average)",scores:avg.map(v=>Math.round(v*10)/10)},280,250,180,SLOT[i]);
    const c=h("div",{class:"cr-card"},dside); const t=h("div",{class:"cr-ct"},c); h("span",{class:"cr-sw "+SLOT[i]},t); h("b",{},t,g.name); h("div",{class:"cr-co"},c,g.note||""); h("div",{class:"cr-cm"},c,ents.length+" chips: "+ents.map(e=>e.short||e.name).join(", ")); });
}

/* ---------- table ---------- */
const tbl=views.table; const tw=h("div",{class:"cr-tw2"},tbl); const table=h("table",{class:"cr-table"},tw);
const thr=h("tr",{},h("thead",{},table)); h("th",{},thr,"Chip"); ORDER.forEach(a=>h("th",{},thr,SHORT[a]));
const tb=h("tbody",{},table); D.entities.forEach(e=>{ const tr=h("tr",{},tb); h("td",{},tr,e.name); ORDER.forEach((a,i)=>{ const td=h("td",{class:"cr-v v"+Math.round(e.scores[idx[i]])},tr,String(e.scores[idx[i]])); td.title=(e.why||[])[idx[i]]||""; }); });

drawCompare(); drawHet(); drawDep(); show("compare"); slider.value=0;
})();
