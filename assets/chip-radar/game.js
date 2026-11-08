/* Dream-chip game + blind test. Data: window.CHIPS (data.js). Language: window.CHIPS_LANG ('en' | 'zh').
   Toy model: each mechanism raises some axes to a level (final axis = max over picks, some picks cap axes),
   and moves cost to hardware, compiler or serving. No combination is scored as "best". */
(function(){
const D=window.CHIPS, LANG=window.CHIPS_LANG||"en", ZH=LANG==="zh";
const I=D.i18n[LANG]||D.i18n.en, AX=D.axes, ORDER=D.order, NS="http://www.w3.org/2000/svg";
const nm=e=>(I.names&&I.names[e.id])||e.name;
const t=(en,zh)=>ZH?zh:en;

/* ---------- constraint cards ---------- */
const CONSTRAINTS=[
 {id:"agent",icon:"⚡",name:t("Agent decode","智能体解码"),goal:t("1,000 tokens/s for one user, on a big model","大模型上，单用户每秒 1,000 token"),budget:19,
  checks:[
   [v=>v.memory>=4,t("Weights close to compute (Memory ≥ 4)","权重离计算足够近（存储 ≥ 4）")],
   [(v,p)=>v.network>=3.5||p.A==="hard",t("Model spread over many chips, or burned into one","模型摊到多颗芯片上，或者直接固化进一颗")],
   [(v,p)=>p.E!=="one"||v.compiler>=4,t("Predictable per-token latency (static schedule or a split)","每个 token 的延迟可预测（静态调度或拆分）")]]},
 {id:"fleet",icon:"🏭",name:t("Fleet MoE","机群 MoE"),goal:t("Serve a 1T-parameter MoE at the lowest $/token","以最低每 token 成本服务万亿参数 MoE"),budget:17,
  checks:[
   [v=>v.network>=4.5,t("Pod-scale network for experts (Network ≥ 4.5)","整柜级网络承载专家（网络 ≥ 4.5）")],
   [v=>v.tco>=4,t("Designed for fleet cost (Datacenter ≥ 4)","按机群成本设计（数据中心 ≥ 4）")],
   [(v,p)=>p.A!=="hard",t("Weights can change when the model does","模型换代时权重能跟着换")]]},
 {id:"edge",icon:"🔋",name:t("Laptop / phone","笔记本 / 手机"),goal:t("Private, always-on assistant at a few watts","几瓦功耗、本地私密、随时在线的助手"),budget:12,
  checks:[
   [(v,p)=>p.F==="batt",t("Battery power budget","电池供电预算")],
   [v=>v.network<=1,t("No pod: one chip, shared memory","没有机柜：一颗芯片，共享内存")],
   [v=>v.compiler>=3||v.algorithm>=3,t("Fixed, efficient graphs (Compiler or Algorithm ≥ 3)","图固定、执行高效（编译器或算法 ≥ 3）")]]},
 {id:"many",icon:"🔀",name:t("Many fine-tunes","大量微调模型"),goal:t("Switch between 100 fine-tuned models in milliseconds","在 100 个微调模型之间毫秒级切换"),budget:19,
  checks:[
   [v=>v.runtime>=3,t("Runtime that swaps models fast (Runtime ≥ 3)","运行时能快速换模型（运行时 ≥ 3）")],
   [(v,p)=>p.A==="tiers"||p.A==="hbm",t("Capacity to keep many models nearby","有足够容量把很多模型放在近处")],
   [(v,p)=>p.A!=="hard",t("Programmable, not one model per tape-out","可编程，不是一次流片一个模型")]]}
];

/* ---------- mechanisms ---------- set: axis levels (max-combined); cap: axis ceilings; cost: [hardware, compiler, serving] */
const ROWS=[
 {id:"A",q:t("Where do the weights live?","权重放在哪？"),opts:[
  {id:"hbm",l:t("HBM stacks","HBM 堆栈"),set:{memory:2.5},cost:[1,0,1]},
  {id:"sram",l:t("Big on-chip SRAM","大容量片上 SRAM"),set:{memory:5,vlsi:3,network:3.5},cost:[2,2,1]},
  {id:"tiers",l:t("SRAM + HBM + DDR tiers","SRAM + HBM + DDR 三层"),set:{memory:4.5,runtime:3},cost:[2,1,2],card:"sn40l"},
  {id:"hard",l:t("Burned into the silicon","直接固化进硅片"),set:{algorithm:5,vlsi:3.5,memory:4},cost:[3,0,0]}]},
 {id:"B",q:t("Who schedules the work?","谁来调度？"),opts:[
  {id:"hw",l:t("Hardware: threads and warps","硬件：线程和 warp"),set:{gpu:4.5,cpu:2,runtime:3.5},cost:[2,1,1]},
  {id:"static",l:t("Compiler, fully static","编译器，全静态"),set:{compiler:5},cap:{cpu:0.5},cost:[0,3,1]},
  {id:"async",l:t("Both: async tiles","两者兼有：异步 tile"),set:{gpu:4,compiler:2.5,runtime:3.5},cost:[2,2,1]}]},
 {id:"C",q:t("How far does one machine reach?","一台「机器」有多大？"),opts:[
  {id:"card",l:t("One chip or card","一颗芯片或一张卡"),set:{network:1},cost:[0,0,0]},
  {id:"rack",l:t("Rack scale-up (copper)","整柜扩展（铜缆）"),set:{network:4.5,tco:3.5},cost:[2,1,1]},
  {id:"ocs",l:t("Reconfigurable optical pod","可重构光交换机群"),set:{network:5,tco:4.5,runtime:2},cost:[2,1,1],card:"v4"}]},
 {id:"D",q:t("How is compute laid out?","计算怎么排布？"),opts:[
  {id:"simt",l:t("SIMT cores","SIMT 核心"),set:{gpu:5,cpu:1.5},cost:[1,0,0]},
  {id:"systolic",l:t("Systolic matrix units","脉动阵列矩阵单元"),set:{compiler:4,vlsi:2.5,cgra:1.5},cost:[1,1,0]},
  {id:"spatial",l:t("Spatial dataflow fabric","空间数据流结构"),set:{cgra:5,compiler:4},cost:[1,3,0]},
  {id:"wafer",l:t("A whole wafer","整片晶圆"),set:{vlsi:5,cgra:4,memory:4.5},cost:[3,2,0]}]},
 {id:"E",q:t("Split the serving work?","推理服务要不要拆？"),opts:[
  {id:"one",l:t("One chip type does it all","一种芯片包办"),set:{},cost:[0,0,1]},
  {id:"pd",l:t("Prefill here, decode there","预填充和解码分开"),set:{runtime:4},cost:[0,1,2],card:"sn50"},
  {id:"afd",l:t("Attention here, FFN there","注意力和 FFN 分开"),set:{runtime:4.5,network:4.5},cost:[0,1,3],card:"lpx"},
  {id:"draft",l:t("Draft fast, verify big","快芯片起草，大芯片验证"),set:{runtime:4,algorithm:2.5},cost:[0,1,2],card:"lpx"}]},
 {id:"F",q:t("Power and cooling?","功耗和散热？"),opts:[
  {id:"air",l:t("Air-cooled, under 200 W","风冷，200 W 以内"),set:{tco:5},cost:[1,0,0],card:"v4i"},
  {id:"liquid",l:t("Liquid-cooled, 1 kW+","液冷，1 kW 以上"),set:{tco:3},cost:[0,0,1]},
  {id:"batt",l:t("Battery, a few watts","电池，几瓦"),set:{tco:4.5,algorithm:2.5},cap:{network:0.5,memory:2.5},cost:[1,1,0],card:"m5"}]}
];
const CARDS={v4:t("TPU v4","TPU v4"),v4i:t("TPU v4i","TPU v4i"),sn40l:"SN40L",sn50:"SN50",m5:"Apple M5",lpx:"Rubin + LPX"};
const PAY=[t("hardware","硬件"),t("compiler","编译器"),t("serving","服务")];

/* ---------- state ---------- */
let C=CONSTRAINTS[0]; const P={};
function vec(){const v={};AX.forEach(a=>v[a]=0.5);const caps={};
 ROWS.forEach(r=>{const o=r.opts.find(x=>x.id===P[r.id]);if(!o)return;
  for(const a in o.set)v[a]=Math.max(v[a],o.set[a]);for(const a in (o.cap||{}))caps[a]=Math.min(caps[a]??5,o.cap[a])});
 for(const a in caps)v[a]=Math.min(v[a],caps[a]);return v}
function cost(){const c=[0,0,0];ROWS.forEach(r=>{const o=r.opts.find(x=>x.id===P[r.id]);if(o)o.cost.forEach((x,i)=>c[i]+=x)});return c}
function nearest(v){let best=null,bd=1e9;D.entities.forEach(e=>{let d=0;AX.forEach((a,i)=>d+=(e.scores[i]-v[a])**2);d=Math.sqrt(d);if(d<bd){bd=d;best=e}});return [best,bd]}

/* ---------- drawing ---------- */
function el(tag,a,p){const n=document.createElementNS(NS,tag);for(const k in a)n.setAttribute(k,a[k]);if(p)p.appendChild(n);return n}
function pts(get,cx,cy,R){return ORDER.map((a,i)=>{const g=-Math.PI/2+i*2*Math.PI/10,v=Math.max(0,Math.min(5,get(a)))/5;return[cx+R*v*Math.cos(g),cy+R*v*Math.sin(g)]})}
function frame(svg,cx,cy,R,labels){for(let k=1;k<=5;k++)el("polygon",{class:"cg-ring",points:pts(()=>k,cx,cy,R).join(" ")},svg);
 ORDER.forEach((a,i)=>{const g=-Math.PI/2+i*2*Math.PI/10,c=Math.cos(g),s=Math.sin(g);el("line",{class:"cg-ring",x1:cx,y1:cy,x2:cx+R*c,y2:cy+R*s},svg);
  if(!labels)return;const x=cx+(R+14)*c,y=cy+(R+14)*s+(Math.abs(c)<.2?(s<0?-18:10):-4),an=Math.abs(c)<.2?"middle":c>0?"start":"end";
  const tx=el("text",{x,y,"text-anchor":an,class:"cg-ax"},svg);el("tspan",{x,class:"cg-ax1"},tx).textContent=I.axes[a][0];el("tspan",{x,dy:16,class:"cg-ax2"},tx).textContent=I.axes[a][1]})}

const root=document.getElementById("chip-game"); if(!root)return; root.setAttribute("lang",LANG);
root.innerHTML=`<div class="cg-step">${t("1 · Pick a constraint","1 · 选一张约束卡")}</div><div class="cg-cons"></div>
<div class="cg-row"><div class="cg-left"><div class="cg-step">${t("2 · Pick one mechanism per row","2 · 每行选一个机制")}</div><div class="cg-rows"></div></div>
<div class="cg-right"><svg class="cg-svg" viewBox="-135 -48 590 490" role="img" aria-label="${t("Your chip's shape","你的芯片形状")}"></svg>
<div class="cg-legend"><span><i class="cg-sw you"></i>${t("your chip","你的芯片")}</span><span><i class="cg-sw near"></i><b class="cg-nn">–</b></span></div></div></div>
<div class="cg-step">${t("3 · Who pays, and does it fit?","3 · 代价由谁付？合不合格？")}</div><div class="cg-out"></div>`;

const consEl=root.querySelector(".cg-cons"),rowsEl=root.querySelector(".cg-rows"),svg=root.querySelector(".cg-svg"),out=root.querySelector(".cg-out");
CONSTRAINTS.forEach(c=>{const b=document.createElement("button");b.className="cg-con";b.innerHTML=`<span class="cg-ci">${c.icon}</span><b>${c.name}</b><small>${c.goal}</small>`;b.onclick=()=>{C=c;render()};b.dataset.id=c.id;consEl.appendChild(b)});
ROWS.forEach(r=>{const d=document.createElement("div");d.className="cg-q";d.innerHTML=`<div class="cg-ql">${r.q}</div>`;const g=document.createElement("div");g.className="cg-opts";
 r.opts.forEach(o=>{const b=document.createElement("button");b.className="cg-opt";b.textContent=o.l;b.dataset.r=r.id;b.dataset.o=o.id;b.onclick=()=>{P[r.id]=P[r.id]===o.id?undefined:o.id;render()};g.appendChild(b)});
 d.appendChild(g);rowsEl.appendChild(d)});
const reset=document.createElement("button");reset.className="cg-reset";reset.textContent=t("reset","重来");reset.onclick=()=>{ROWS.forEach(r=>delete P[r.id]);render()};rowsEl.appendChild(reset);

function render(){
 consEl.querySelectorAll(".cg-con").forEach(b=>b.classList.toggle("on",b.dataset.id===C.id));
 rowsEl.querySelectorAll(".cg-opt").forEach(b=>b.classList.toggle("on",P[b.dataset.r]===b.dataset.o));
 const v=vec(),n=ROWS.filter(r=>P[r.id]).length,[ne,nd]=nearest(v);
 svg.innerHTML="";frame(svg,160,195,150,true);
 if(n>=3){el("polygon",{class:"cg-near",points:pts(a=>ne.scores[AX.indexOf(a)],160,195,150).join(" ")},svg)}
 const yp=pts(a=>v[a],160,195,150);el("polygon",{class:"cg-you",points:yp.join(" ")},svg);yp.forEach(q=>el("circle",{class:"cg-dot",cx:q[0],cy:q[1],r:4},svg));
 root.querySelector(".cg-nn").textContent=n>=3?`${t("closest real chip","最接近的真实芯片")}: ${nm(ne)}`:t("closest real chip appears after 3 picks","选满 3 行后显示最接近的真实芯片");
 const c=cost(),tot=c[0]+c[1]+c[2],mx=Math.max(C.budget*1.25,tot);
 const bars=c.map((x,i)=>`<div class="cg-bar"><span>${PAY[i]}</span><div class="cg-track"><div class="cg-fill f${i}" style="width:${x/mx*100}%"></div></div><b>${x}</b></div>`).join("");
 const over=tot-C.budget;
 const budget=n===0?"":over>=5?`<p class="cg-warn">${t(`Over budget by ${over}. Everyone got what they asked for. This is how a committee chip is born.`,`超出预算 ${over} 点。每个人的要求都满足了——十项全满分的芯片就是这么开会开出来的。`)}</p>`:over>0?`<p class="cg-warn">${t(`Over budget by ${over}. Something has to give: which row would you change?`,`超出预算 ${over} 点。总得放弃点什么：你会改哪一行？`)}</p>`:`<p class="cg-ok">${t(`Within budget (${tot} of ${C.budget}).`,`预算之内（${tot} / ${C.budget}）。`)}</p>`;
 const checks=C.checks.map(([f,l])=>{const ok=n>0&&f(v,P);return `<li class="${n===0?"":ok?"y":"n"}">${n===0?"○":ok?"✓":"✗"} ${l}</li>`}).join("");
 const cards=[...new Set(ROWS.map(r=>(r.opts.find(o=>o.id===P[r.id])||{}).card).filter(Boolean))];
 const cardHtml=cards.length?`<p class="cg-cards">${t("Real teams made this bet:","真实团队押过同样的注：")} ${cards.map(k=>`<a href="#card-${k}">${CARDS[k]} →</a>`).join(" ")}</p>`:"";
 out.innerHTML=`<div class="cg-pay">${bars}<div class="cg-bar tot"><span>${t("total","合计")}</span><div class="cg-track"><div class="cg-budget" style="left:${C.budget/mx*100}%"></div></div><b>${tot}</b></div></div>${budget}<ul class="cg-checks"><li class="cg-goal">${C.icon} ${C.name}: ${C.goal}</li>${checks}</ul>${cardHtml}`;
}
render();

/* ---------- blind test ---------- */
const bt=document.getElementById("chip-blind"); if(!bt)return; bt.setAttribute("lang",LANG);
const BG=[["compiler",t("Compiler people","编译器出身")],["gpu",t("GPU people","GPU 出身")],["dsp",t("Interconnect and DSP people","互连和 DSP 出身")],["tco",t("Datacenter people","数据中心出身")]];
const QS=[["groq_lpu1","compiler"],["dmatrix_corsair","dsp"],["tpu_v4i","tco"],["amd_mi300x","gpu"]];
const DS=(I.designers)||{};
bt.innerHTML=`<div class="cg-bts"></div><p class="cg-bscore"></p>`;
const wrap=bt.querySelector(".cg-bts");let right=0,done=0;
QS.forEach(([id,ans],k)=>{const e=D.entities.find(x=>x.id===id);const box=document.createElement("div");box.className="cg-bt";
 const s=el("svg",{viewBox:"0 0 140 130",class:"cg-bsvg"});frame(s,70,65,52,false);el("polygon",{class:"cg-you",points:pts(a=>e.scores[AX.indexOf(a)],70,65,52).join(" ")},s);
 box.appendChild(s);const h=document.createElement("div");h.className="cg-bh";h.textContent=t(`Chip ${String.fromCharCode(65+k)}`,`芯片 ${String.fromCharCode(65+k)}`);box.appendChild(h);
 const g=document.createElement("div");g.className="cg-bopts";
 BG.forEach(([b,l])=>{const btn=document.createElement("button");btn.className="cg-opt sm";btn.textContent=l;btn.onclick=()=>{if(box.dataset.done)return;box.dataset.done=1;done++;
  if(b===ans){right++;btn.classList.add("y")}else{btn.classList.add("n");g.querySelector(`[data-b="${ans}"]`).classList.add("y")}
  const r=document.createElement("div");r.className="cg-reveal";r.innerHTML=`<b>${nm(e)}</b> (${e.year})${DS[id]?"<br>"+DS[id]:""}`;box.appendChild(r);
  if(done===QS.length)bt.querySelector(".cg-bscore").textContent=t(`${right} of ${QS.length}. Chance would be 1.`,`答对 ${right} / ${QS.length}。瞎猜的期望是 1。`)};btn.dataset.b=b;g.appendChild(btn)});
 box.appendChild(g);wrap.appendChild(box)});
})();
