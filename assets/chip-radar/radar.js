/* Inference-chip design radar. Data: window.CHIPS. Language: window.CHIPS_LANG ('en' | 'zh'). */
(function(){
const D = window.CHIPS, LANG = window.CHIPS_LANG || "en";
const I = (D.i18n && D.i18n[LANG]) || D.i18n.en;
const AXES = D.axes, ORDER = D.order;
const idx = ORDER.map(a => AXES.indexOf(a));
const T = k => I.ui[k] || D.i18n.en.ui[k] || k;
const AX1 = a => I.axes[a][0], AX2 = a => I.axes[a][1];
const byId = {}; D.entities.forEach(e => byId[e.id] = e);
const nm = e => (I.names && I.names[e.id]) || e.name;
const sh = e => (I.short && I.short[e.id]) || e.short || e.name;
const one = e => (I.one && I.one[e.id]) || e.one_liner || "";
const why = (e,k) => (I.why && I.why[e.id] && I.why[e.id][k]) || (e.why||[])[k] || "";
const SLOT = ["s1","s2","s3"], NS = "http://www.w3.org/2000/svg", N = ORDER.length;
const el = (t,a={},p) => { const n=document.createElementNS(NS,t); for(const k in a) n.setAttribute(k,a[k]); if(p) p.appendChild(n); return n; };
const h = (t,a={},p,txt) => { const n=document.createElement(t); for(const k in a) n.setAttribute(k,a[k]); if(txt!=null) n.textContent=txt; if(p) p.appendChild(n); return n; };
const root = document.getElementById("chip-radar");
const tip = h("div",{class:"cr-tip",role:"status"},document.body);
const ang = i => -Math.PI/2 + i*2*Math.PI/N;

function pts(sc,cx,cy,R){ return ORDER.map((a,i)=>{ const v=sc[idx[i]]/5; return [cx+R*v*Math.cos(ang(i)), cy+R*v*Math.sin(ang(i))]; }); }
function frame(svg,cx,cy,R,mode){
  const g=el("g",{class:"cr-grid"},svg);
  for(let k=1;k<=5;k++) el("polygon",{points:ORDER.map((a,i)=>[cx+R*k/5*Math.cos(ang(i)),cy+R*k/5*Math.sin(ang(i))].join(",")).join(" "),class:k===5?"cr-ring cr-ring-out":"cr-ring"},g);
  ORDER.forEach((a,i)=>{ const c=Math.cos(ang(i)), s=Math.sin(ang(i));
    el("line",{x1:cx,y1:cy,x2:cx+R*c,y2:cy+R*s,class:"cr-spoke"},g);
    if(!mode) return;
    const lx=cx+(R+16)*c, ly=cy+(R+16)*s + (s>0.3?10:s<-0.3?-12:0);
    const anchor=Math.abs(c)<0.2?"middle":(c>0?"start":"end");
    const t=el("text",{x:lx,y:ly,class:"cr-axis","text-anchor":anchor},g);
    if(mode==="long"){ el("tspan",{x:lx,dy:"-0.1em"},t).textContent=AX1(a); el("tspan",{x:lx,dy:"1.25em",class:"cr-axis2"},t).textContent=AX2(a); }
    else t.textContent=AX1(a);
  });
  if(mode==="long") [1,3,5].forEach(k=>{ el("text",{x:cx+4,y:cy-R*k/5+12,class:"cr-tick"},g).textContent=k; });
}
function shape(svg,e,cx,cy,R,cls,opts={}){
  const p=pts(e.scores,cx,cy,R);
  el("polygon",{points:p.map(q=>q.join(",")).join(" "),class:"cr-shape "+cls},svg);
  if(opts.dots===false) return;
  p.forEach((q,i)=>{ el("circle",{cx:q[0],cy:q[1],r:4,class:"cr-dot "+cls},svg);
    const hit=el("circle",{cx:q[0],cy:q[1],r:11,class:"cr-hit",tabindex:"0"},svg);
    const show=ev=>showTip(ev,e,idx[i]); ["mouseenter","mousemove","focus"].forEach(k=>hit.addEventListener(k,show)); hit.addEventListener("mouseleave",hideTip); hit.addEventListener("blur",hideTip); });
}
function showTip(ev,e,ai){
  const c=e.conf?T("conf_"+e.conf[ai]):"";
  tip.innerHTML=`<b>${e.label||nm(e)}</b><br><span class="cr-tk">${AX1(AXES[ai])} · ${AX2(AXES[ai])}</span> <b>${e.scores[ai]}</b>/5${c?` · ${c}`:""}${e.id&&why(e,ai)?`<div class="cr-tw">${why(e,ai)}</div>`:""}`;
  tip.style.display="block";
  let x=ev.clientX, y=ev.clientY; if(x==null){ const r=ev.target.getBoundingClientRect(); x=r.right; y=r.bottom; }
  tip.style.left=Math.min(x+14, window.innerWidth-300)+"px"; tip.style.top=(y+14)+"px";
}
function hideTip(){ tip.style.display="none"; }
const VB="-70 -5 720 520", CX=290, CY=255, R=175;
const card=(parent,cls,title,lines)=>{ const c=h("div",{class:"cr-card"},parent); const t=h("div",{class:"cr-ct"},c); h("span",{class:"cr-sw "+cls},t); h("b",{},t,title); (lines||[]).forEach(([k,v])=>v&&h("div",{class:k},c,v)); return c; };

/* ---------- layout ---------- */
root.innerHTML=""; root.setAttribute("lang",LANG);
const tabs=h("div",{class:"cr-tabs",role:"tablist"},root); const views={};
[["compare","tab_compare"],["series","tab_series"],["grid","tab_grid"],["hetero","tab_hetero"],["deploy","tab_deploy"],["table","tab_table"]].forEach(([k,lab])=>{
  const b=h("button",{class:"cr-tab",role:"tab","data-k":k},tabs,T(lab)); b.onclick=()=>show(k); views[k]=h("div",{class:"cr-view","data-k":k},root); });
function show(k){ root.querySelectorAll(".cr-tab").forEach(b=>b.classList.toggle("on",b.dataset.k===k)); Object.entries(views).forEach(([kk,v])=>v.style.display=kk===k?"block":"none"); hideTip(); if(k==="series") drawSeries(); }

/* ---------- compare ---------- */
let sel=(D.defaultCompare||[]).slice(0,3);
const cmp=views.compare; const cmpTop=h("div",{class:"cr-row"},cmp);
const big=el("svg",{viewBox:VB,class:"cr-big",role:"img","aria-label":T("aria_compare")},cmpTop);
const side=h("div",{class:"cr-side"},cmpTop);
const pick=h("div",{class:"cr-pick"},cmp); h("div",{class:"cr-hint"},pick,T("hint_compare"));
D.groups.forEach(g=>{ const row=h("div",{class:"cr-grp"},pick); h("span",{class:"cr-gl"},row,(I.groups&&I.groups[g.key])||g.name);
  g.ids.forEach(id=>{ const e=byId[id]; if(!e) return; const b=h("button",{class:"cr-chip","data-id":id},row,sh(e)); b.onclick=()=>toggle(id); }); });
function toggle(id){ const i=sel.indexOf(id); if(i>=0) sel.splice(i,1); else { if(sel.length>=3) sel.shift(); sel.push(id);} drawCompare(); }
function meta(e){ return [(LANG==="zh"?e.vendorLabel_zh:e.vendorLabel)||e.vendor,e.year,T("dep_"+e.deploy),T("role_"+e.role)].filter(Boolean).join(" · "); }
function strongest(e){ return T("strongest")+" "+ORDER.map((a,k)=>[a,e.scores[idx[k]]]).sort((x,y)=>y[1]-x[1]).slice(0,3).map(x=>`${AX1(x[0])} ${x[1]}`).join(" · "); }
function designers(e){ const d=I.designers&&I.designers[e.id]; return d?T("designed_by")+" "+d:""; }
function drawCompare(){
  big.innerHTML=""; frame(big,CX,CY,R,"long"); sel.forEach((id,i)=>shape(big,byId[id],CX,CY,R,SLOT[i]));
  pick.querySelectorAll(".cr-chip").forEach(b=>{ const i=sel.indexOf(b.dataset.id); b.className="cr-chip"+(i>=0?" on "+SLOT[i]:""); });
  side.innerHTML=""; if(!sel.length) h("p",{class:"cr-muted"},side,T("nothing"));
  sel.forEach((id,i)=>{ const e=byId[id]; card(side,SLOT[i],nm(e),[["cr-cm",meta(e)],["cr-co",one(e)],["cr-cd",designers(e)],["cr-cs",strongest(e)]]); });
}

/* ---------- series (animated) ---------- */
const ser=views.series; let sKey=D.series[0].key, sI=0, cur=null, anim=null, timer=null;
const sPick=h("div",{class:"cr-grp"},ser);
D.series.forEach(s=>{ const b=h("button",{class:"cr-chip","data-k":s.key},sPick,(I.series&&I.series[s.key])||s.name); b.onclick=()=>{ sKey=s.key; sI=0; cur=null; stop(); drawSeries(); }; });
const sRow=h("div",{class:"cr-row"},ser);
const sSvg=el("svg",{viewBox:VB,class:"cr-big",role:"img","aria-label":T("aria_series")},sRow);
const sSide=h("div",{class:"cr-side"},sRow);
const sCtl=h("div",{class:"cr-ctl"},ser); const play=h("button",{class:"cr-btn"},sCtl,"▶ "+T("play"));
const slider=h("input",{type:"range",min:0,max:1,step:1,value:0,class:"cr-range","aria-label":T("tab_series")},sCtl);
const ticks=h("div",{class:"cr-ticks"},ser); sRow.insertBefore(sCtl,sSide); sRow.insertBefore(ticks,sSide);
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function curSeries(){ return D.series.find(s=>s.key===sKey); }
function drawSeries(){
  const s=curSeries(); sPick.querySelectorAll(".cr-chip").forEach(b=>b.classList.toggle("on",b.dataset.k===sKey));
  slider.max=s.ids.length-1; slider.value=sI;
  ticks.innerHTML=""; s.ids.forEach((id,k)=>{ const b=h("button",{class:"cr-tk2"+(k===sI?" on":"")},ticks,sh(byId[id])); b.onclick=()=>{ sI=k; stop(); drawSeries(); }; });
  const e=byId[s.ids[sI]], first=byId[s.ids[0]];
  sSide.innerHTML=""; card(sSide,"s1",nm(e),[["cr-cm",meta(e)],["cr-co",one(e)],["cr-cd",designers(e)]]);
  if(sI>0){ const prev=byId[s.ids[sI-1]]; const ch=ORDER.map((a,k)=>[a,e.scores[idx[k]]-prev.scores[idx[k]]]).filter(x=>Math.abs(x[1])>=0.5).sort((x,y)=>Math.abs(y[1])-Math.abs(x[1])).slice(0,4);
    if(ch.length) h("div",{class:"cr-card"},sSide).innerHTML=`<div class="cr-cm">${T("vs")} ${sh(prev)}</div>`+ch.map(([a,d])=>`<div>${AX1(a)} <b class="${d>0?"up":"dn"}">${d>0?"+":""}${d}</b></div>`).join(""); }
  card(sSide,"ghost",T("ghost")+" "+sh(first),[]);
  const from=cur||e.scores, to=e.scores; cancelAnimationFrame(anim); const t0=performance.now();
  const step=now=>{ const t=Math.min(1,(now-t0)/380), k=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2; const sc=lerp(from,to,k);
    sSvg.innerHTML=""; frame(sSvg,CX,CY,R,"long"); if(sI>0) shape(sSvg,first,CX,CY,R,"ghost",{dots:false}); shape(sSvg,{...e,scores:sc},CX,CY,R,"s1");
    el("text",{x:CX,y:CY+R+70,class:"cr-big-year","text-anchor":"middle"},sSvg).textContent=sh(e)+" · "+e.year;
    if(t<1) anim=requestAnimationFrame(step); else cur=to.slice(); };
  anim=requestAnimationFrame(step);
}
function stop(){ if(timer){ clearInterval(timer); timer=null; } play.textContent="▶ "+T("play"); }
slider.oninput=()=>{ sI=+slider.value; stop(); drawSeries(); };
play.onclick=()=>{ if(timer){ stop(); return; } const s=curSeries(); play.textContent="❚❚ "+T("pause"); if(sI>=s.ids.length-1){ sI=0; cur=null; } drawSeries();
  timer=setInterval(()=>{ if(sI>=curSeries().ids.length-1){ stop(); return; } sI++; drawSeries(); },1000); };

/* ---------- grid ---------- */
const grid=views.grid; h("div",{class:"cr-hint"},grid,T("hint_grid"));
D.archetypes.forEach(ar=>{ const sec=h("div",{class:"cr-arch"},grid); const A=(I.archetypes&&I.archetypes[ar.key])||[ar.name,ar.desc];
  h("div",{class:"cr-an"},sec,A[0]); h("div",{class:"cr-ad"},sec,A[1]); const wrap=h("div",{class:"cr-mini-wrap"},sec);
  ar.ids.forEach(id=>{ const e=byId[id]; if(!e) return; const cell=h("button",{class:"cr-mini","aria-label":nm(e)},wrap);
    const s=el("svg",{viewBox:"0 0 140 132"},cell); frame(s,70,66,46,null); shape(s,e,70,66,46,"s1",{dots:false});
    h("div",{class:"cr-mn"},cell,sh(e)); h("div",{class:"cr-my"},cell,String(e.year||""));
    cell.onclick=()=>{ sel=[id]; drawCompare(); show("compare"); root.scrollIntoView({behavior:"smooth"}); }; }); });

/* ---------- heterogeneous (components + flow table; no combined shape) ---------- */
const het=views.hetero; let hsel=D.hetero[0].id; h("div",{class:"cr-hint"},het,T("hint_hetero"));
const hpick=h("div",{class:"cr-grp"},het); const hrow=h("div",{class:"cr-row"},het);
const hsvg=el("svg",{viewBox:VB,class:"cr-big",role:"img","aria-label":T("aria_hetero")},hrow); const hside=h("div",{class:"cr-side"},hrow);
const hflow=h("div",{class:"cr-tw2"},het);
const hz=(o,k)=>LANG==="zh"&&o["zh_"+k]?o["zh_"+k]:o[k];
D.hetero.forEach(s=>{ const b=h("button",{class:"cr-chip","data-id":s.id},hpick,hz(s,"name")); b.onclick=()=>{ hsel=s.id; drawHet(); }; });
function drawHet(){ const s=D.hetero.find(x=>x.id===hsel);
  hpick.querySelectorAll(".cr-chip").forEach(b=>b.classList.toggle("on",b.dataset.id===hsel));
  hsvg.innerHTML=""; frame(hsvg,CX,CY,R,"long"); s.components.forEach((c,i)=>shape(hsvg,byId[c],CX,CY,R,SLOT[i]));
  hside.innerHTML=""; s.components.forEach((c,i)=>card(hside,SLOT[i],nm(byId[c]),[["cr-cm",meta(byId[c])]]));
  hflow.innerHTML=""; const t=h("table",{class:"cr-table cr-flow"},hflow); const hr=h("tr",{},h("thead",{},t));
  ["h_cut","h_who","h_moves","h_cost"].forEach(k=>h("th",{},hr,T(k)));
  const tb=h("tbody",{},t); s.modes.forEach(m=>{ const tr=h("tr",{},tb); ["cut","who","moves","cost"].forEach(k=>h("td",{},tr,hz(m,k))); });
  const st=h("div",{class:"cr-hint"},hflow); st.innerHTML="<b>"+T("h_status")+":</b> "+hz(s,"status")+' <a href="'+s.src+'" target="_blank" rel="noopener">↗</a>'; }

/* ---------- deployment ---------- */
const dep=views.deploy; h("div",{class:"cr-hint"},dep,T("hint_deploy"));
const drow=h("div",{class:"cr-row"},dep); const dsvg=el("svg",{viewBox:VB,class:"cr-big",role:"img","aria-label":T("aria_deploy")},drow); const dside=h("div",{class:"cr-side"},drow);
frame(dsvg,CX,CY,R,"long");
D.deployGroups.forEach((g,i)=>{ const ents=g.ids.map(id=>byId[id]); const avg=AXES.map((_,k)=>Math.round(ents.reduce((s,e)=>s+e.scores[k],0)/ents.length*10)/10);
  const G=(I.deploy&&I.deploy[g.key])||[g.name,g.note]; shape(dsvg,{label:G[0]+" ("+T("average")+")",scores:avg},CX,CY,R,SLOT[i]);
  card(dside,SLOT[i],G[0],[["cr-co",G[1]],["cr-cm",ents.length+" "+T("chips")+": "+ents.map(sh).join(", ")]]); });

/* ---------- table ---------- */
const tw=h("div",{class:"cr-tw2"},views.table); const table=h("table",{class:"cr-table"},tw);
const thr=h("tr",{},h("thead",{},table)); h("th",{},thr,T("chip")); ORDER.forEach(a=>h("th",{title:AX2(a)},thr,AX1(a)));
const tb=h("tbody",{},table); D.entities.forEach(e=>{ const tr=h("tr",{},tb); h("td",{},tr,sh(e)); ORDER.forEach((a,i)=>{ const td=h("td",{class:"cr-v v"+Math.round(e.scores[idx[i]])+(e.conf&&e.conf[idx[i]]==="L"?" lo":"")},tr,String(e.scores[idx[i]])); td.title=why(e,idx[i]); }); });
h("div",{class:"cr-hint"},views.table,T("hint_table"));

drawCompare(); drawHet(); show("compare");
})();
