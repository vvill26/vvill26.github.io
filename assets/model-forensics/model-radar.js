/* Model-fit radar (Forensic Will part 3), adapted from chip-radar. Data: window.MFR. Language: window.CHIPS_LANG ('en' | 'zh'). */
(function(){
const D = window.MFR, LANG = window.CHIPS_LANG || "en";
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
const SLOT = ["s1","s2","s3","s4"], NS = "http://www.w3.org/2000/svg", N = ORDER.length;
const el = (t,a={},p) => { const n=document.createElementNS(NS,t); for(const k in a) n.setAttribute(k,a[k]); if(p) p.appendChild(n); return n; };
const h = (t,a={},p,txt) => { const n=document.createElement(t); for(const k in a) n.setAttribute(k,a[k]); if(txt!=null) n.textContent=txt; if(p) p.appendChild(n); return n; };
const root = document.getElementById("chip-radar");
const tip = h("div",{class:"cr-tip",role:"status"},document.body);
const ang = i => -Math.PI/2 + i*2*Math.PI/N;

function valid(e,k){return e.scores[k]!=null && !(e.np&&e.np[k]) && !(e.na&&e.na[k]) && !(e.pending&&e.pending[k]);}
function pts(sc,cx,cy,R){ return ORDER.map((a,i)=>{ if(sc[idx[i]]==null)return null; const v=sc[idx[i]]/5; return [cx+R*v*Math.cos(ang(i)), cy+R*v*Math.sin(ang(i))]; }); }
function frame(svg,cx,cy,R,mode){
  const g=el("g",{class:"cr-grid"},svg);
  for(let k=1;k<=5;k++) el("polygon",{points:ORDER.map((a,i)=>[cx+R*k/5*Math.cos(ang(i)),cy+R*k/5*Math.sin(ang(i))].join(",")).join(" "),class:k===5?"cr-ring cr-ring-out":"cr-ring"},g);
  ORDER.forEach((a,i)=>{ const c=Math.cos(ang(i)), s=Math.sin(ang(i));
    el("line",{x1:cx,y1:cy,x2:cx+R*c,y2:cy+R*s,class:"cr-spoke"},g);
    if(!mode) return;
    const off=mode==="mini"?8:16, lx=cx+(R+off)*c, ly=cy+(R+off)*s + (mode==="mini"?(s<-0.95?-16:s<-0.3?-4:s>0.3?8:-2):(s>0.3?10:s<-0.3?-12:0));
    const anchor=Math.abs(c)<0.2?"middle":(c>0?"start":"end");
    const t=el("text",{x:lx,y:ly,class:"cr-axis","text-anchor":anchor},g);
    if(mode==="long"){ el("tspan",{x:lx,dy:"-0.1em"},t).textContent=AX1(a); el("tspan",{x:lx,dy:"1.25em",class:"cr-axis2"},t).textContent=AX2(a); }
    else if(mode==="mini"){ t.setAttribute("class","mf-ax1"); el("tspan",{x:lx,dy:"-0.1em"},t).textContent=AX1(a); el("tspan",{x:lx,dy:"1.2em",class:"mf-ax2"},t).textContent=AX2(a); }
    else t.textContent=AX1(a);
  });
  if(mode==="long") [1,3,5].forEach(k=>{ el("text",{x:cx+4,y:cy-R*k/5+12,class:"cr-tick"},g).textContent=k; });
}
function shape(svg,e,cx,cy,R,cls,opts={}){
  const p=pts(e.scores,cx,cy,R), complete=p.every(Boolean);
  if(complete) el("polygon",{points:p.map(q=>q.join(",")).join(" "),class:"cr-shape "+cls},svg);
  else p.forEach((q,i)=>{const z=p[(i+1)%p.length];if(q&&z)el("line",{x1:q[0],y1:q[1],x2:z[0],y2:z[1],class:"cr-shape "+cls,style:"fill:none;stroke-width:2"},svg);});
  if(opts.dots===false&&complete)return;
  p.forEach((q,i)=>{if(!q)return;
    el("circle",{cx:q[0],cy:q[1],r:4,class:"cr-dot "+cls},svg);
    const hit=el("circle",{cx:q[0],cy:q[1],r:11,class:"cr-hit",tabindex:"0"},svg);
    const show=ev=>showTip(ev,e,idx[i]);["mouseenter","mousemove","focus"].forEach(k=>hit.addEventListener(k,show));hit.addEventListener("mouseleave",hideTip);hit.addEventListener("blur",hideTip);
  });
}
function showTip(ev,e,ai){
  const c=e.conf?T("conf_"+e.conf[ai]):"";
  const NP=e.np&&e.np[ai]; tip.innerHTML=`<b>${e.label||nm(e)}</b><br><span class="cr-tk">${AX1(AXES[ai])} · ${AX2(AXES[ai])}</span> <b>${NP?T("np"):e.scores[ai]+"</b>/5<b>"}</b>${c&&!NP?` · ${c}`:""}${e.id&&why(e,ai)?`<div class="cr-tw">${why(e,ai)}</div>`:""}`;
  if(e.counts)tip.innerHTML+=`<div>n = ${e.counts[ai]}</div>`; tip.style.display="block";
  let x=ev.clientX, y=ev.clientY; if(x==null){ const r=ev.target.getBoundingClientRect(); x=r.right; y=r.bottom; }
  tip.style.left=Math.min(x+14, window.innerWidth-300)+"px"; tip.style.top=(y+14)+"px";
}
function hideTip(){ tip.style.display="none"; }
const VB="-70 -5 720 520", CX=290, CY=255, R=175;
const card=(parent,cls,title,lines)=>{ const c=h("div",{class:"cr-card"},parent); const t=h("div",{class:"cr-ct"},c); h("span",{class:"cr-sw "+cls},t); h("b",{},t,title); (lines||[]).forEach(([k,v])=>v&&h("div",{class:k},c,v)); return c; };

/* ---------- layout ---------- */
root.innerHTML=""; root.setAttribute("lang",LANG);
h("p",{class:"cr-hint"},root,LANG==="zh"?"审计修正版：缺失格留空，不连成低分面积；均值注明每轴 n。A10 只描述，A9 只计第三方首发支持，闭源与设备绑定模型不适用。":"Audit corrections: gaps are not low-score areas; means show per-axis n. A10 is descriptive; A9 uses third-party launch support; closed/device-bound models are n/a.");
const tabs=h("div",{class:"cr-tabs",role:"tablist"},root); const views={};
[["compare","tab_compare"],["grid","tab_grid"],["deploy","tab_deploy"],["table","tab_table"]].forEach(([k,lab])=>{
  const b=h("button",{class:"cr-tab",role:"tab","data-k":k},tabs,T(lab)); b.onclick=()=>show(k); views[k]=h("div",{class:"cr-view","data-k":k},root); });
function show(k){ root.querySelectorAll(".cr-tab").forEach(b=>b.classList.toggle("on",b.dataset.k===k)); Object.entries(views).forEach(([kk,v])=>v.style.display=kk===k?"block":"none"); hideTip(); }

/* ---------- compare ---------- */
let sel=(D.defaultCompare||[]).slice(0,3);
const cmp=views.compare; const cmpTop=h("div",{class:"cr-row"},cmp);
const big=el("svg",{viewBox:VB,class:"cr-big",role:"img","aria-label":T("aria_compare")},cmpTop);
const side=h("div",{class:"cr-side"},cmpTop);
const pick=h("div",{class:"cr-pick"},cmp); h("div",{class:"cr-hint"},pick,T("hint_compare"));
D.groups.forEach(g=>{ const row=h("div",{class:"cr-grp"},pick); h("span",{class:"cr-gl"},row,(I.groups&&I.groups[g.key])||g.name);
  g.ids.forEach(id=>{ const e=byId[id]; if(!e) return; const b=h("button",{class:"cr-chip","data-id":id},row,sh(e)); b.onclick=()=>toggle(id); }); });
function toggle(id){ const i=sel.indexOf(id); if(i>=0) sel.splice(i,1); else { if(sel.length>=3) sel.shift(); sel.push(id);} drawCompare(); }
function meta(e){ return [(LANG==="zh"?e.vendorLabel_zh:e.vendorLabel)||e.vendor,e.year,T("layer_"+e.layer)].filter(Boolean).join(" · "); }
function strongest(e){ return T("strongest")+" "+ORDER.map((a,k)=>[a,e.scores[idx[k]]]).filter(x=>valid(e,AXES.indexOf(x[0]))&&x[0]!=="A10").sort((x,y)=>y[1]-x[1]).slice(0,3).map(x=>`${AX1(x[0])} ${x[1]}`).join(" · "); }
function designers(e){ const d=I.designers&&I.designers[e.id]; return d?T("designed_by")+" "+d:""; }
function drawCompare(){
  big.innerHTML=""; frame(big,CX,CY,R,"long"); sel.forEach((id,i)=>shape(big,byId[id],CX,CY,R,SLOT[i]));
  pick.querySelectorAll(".cr-chip").forEach(b=>{ const i=sel.indexOf(b.dataset.id); b.className="cr-chip"+(i>=0?" on "+SLOT[i]:""); });
  side.innerHTML=""; if(!sel.length) h("p",{class:"cr-muted"},side,T("nothing"));
  sel.forEach((id,i)=>{ const e=byId[id]; card(side,SLOT[i],nm(e),[["cr-cm",meta(e)],["cr-co",one(e)],["cr-cd",designers(e)],["cr-cs",strongest(e)]]); });
}

/* ---------- grid ---------- */
const grid=views.grid; h("div",{class:"cr-hint"},grid,T("hint_grid"));
D.archetypes.forEach(ar=>{ const sec=h("div",{class:"cr-arch"},grid); const A=(I.archetypes&&I.archetypes[ar.key])||[ar.name,ar.desc];
  h("div",{class:"cr-an"},sec,A[0]); h("div",{class:"cr-ad"},sec,A[1]); const wrap=h("div",{class:"cr-mini-wrap"},sec);
  ar.ids.forEach(id=>{ const e=byId[id]; if(!e) return; const cell=h("button",{class:"cr-mini","aria-label":nm(e)},wrap);
    const s=el("svg",{viewBox:"-85 -4 490 272"},cell); frame(s,160,138,78,"mini"); shape(s,e,160,138,78,"s1",{dots:false});
    h("div",{class:"cr-mn"},cell,sh(e)); h("div",{class:"cr-my"},cell,String(e.year||""));
    cell.onclick=()=>{ sel=[id]; drawCompare(); show("compare"); root.scrollIntoView({behavior:"smooth"}); }; }); });

/* ---------- deployment ---------- */
const dep=views.deploy; h("div",{class:"cr-hint"},dep,T("hint_deploy"));
const drow=h("div",{class:"cr-row"},dep); const dsvg=el("svg",{viewBox:VB,class:"cr-big",role:"img","aria-label":T("aria_deploy")},drow); const dside=h("div",{class:"cr-side"},drow);
frame(dsvg,CX,CY,R,"long");
D.deployGroups.forEach((g,i)=>{ const ents=g.ids.map(id=>byId[id]); const counts=AXES.map((_,k)=>ents.filter(e=>valid(e,k)).length); const avg=AXES.map((_,k)=>{ const v=ents.filter(e=>valid(e,k)); return v.length?Math.round(v.reduce((s,e)=>s+e.scores[k],0)/v.length*10)/10:null; });
  const G=(I.deploy&&I.deploy[g.key])||[g.name,g.note]; shape(dsvg,{label:G[0]+" ("+T("average")+")",scores:avg,counts:counts},CX,CY,R,SLOT[i]);
  card(dside,SLOT[i],G[0],[["cr-co",G[1]],["cr-cm",ents.length+" "+T("chips")+": "+ents.map(sh).join(", ")+" · n(A1…A10)="+counts.join("/")]]); });

/* ---------- table ---------- */
const tw=h("div",{class:"cr-tw2"},views.table); const table=h("table",{class:"cr-table"},tw);
const thr=h("tr",{},h("thead",{},table)); h("th",{},thr,T("chip")); ORDER.forEach(a=>h("th",{title:AX2(a)},thr,AX1(a)));
const tb=h("tbody",{},table); D.entities.forEach(e=>{ const tr=h("tr",{},tb); h("td",{},tr,sh(e)); ORDER.forEach((a,i)=>{ const td=h("td",{class:"cr-v"+(e.scores[idx[i]]==null?"":" v"+Math.round(e.scores[idx[i]]))+(e.conf&&e.conf[idx[i]]==="L"?" lo":"")},tr,(e.np&&e.np[idx[i]])?"NP":(e.na&&e.na[idx[i]])?"n/a":(e.pending&&e.pending[idx[i]])?(LANG==="zh"?"待核":"pending"):String(e.scores[idx[i]])); td.title=why(e,idx[i]); }); });
h("div",{class:"cr-hint"},views.table,T("hint_table"));

drawCompare(); show("compare");
})();
