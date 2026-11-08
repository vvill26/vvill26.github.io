/* Dream-chip game + blind test. Data: window.CHIPS (data.js). Language: window.CHIPS_LANG ('en' | 'zh').
   Toy model: each mechanism raises some axes to a level (final axis = max over picks, some picks cap axes),
   and moves cost to hardware, compiler or serving. No combination is scored as "best". */
(function(){
const D=window.CHIPS, LANG=window.CHIPS_LANG||"en", ZH=LANG==="zh";
const I=D.i18n[LANG]||D.i18n.en, AX=D.axes, ORDER=D.order, NS="http://www.w3.org/2000/svg";
const nm=e=>{const n=(I.names&&I.names[e.id])||e.name;return ZH||n.includes(e.vendorLabel)?n:e.vendorLabel+" "+n};
const t=(en,zh)=>ZH?zh:en;

/* ---------- design scenarios ---------- */
const CONSTRAINTS=[
 {id:"agent",icon:"⚡",name:t("Fast agent","交互式 Agent"),goal:t("A coding agent at 1,000 tokens/s for one user, on a big model","大模型上的编程 Agent，单用户每秒 1,000 token"),budget:19,
  checks:[
   [v=>v.memory>=4,t("Weights close to compute (Memory ≥ 4)","权重离计算足够近（存储 ≥ 4）")],
   [(v,p)=>v.network>=3.5||p.A==="hard",t("Model spread over many chips, or hardwired into one","模型摊到多颗芯片上，或者直接固化进一颗")],
   [(v,p)=>p.E!=="one"||v.compiler>=4,t("Predictable per-token latency (static scheduling or disaggregation)","每个 token 的延迟可预测（静态调度或分离部署）")]]},
 {id:"api",icon:"🏭",name:t("Max throughput","高吞吐服务"),goal:t("Millions of users, big batches, the lowest $/token","上百万用户、大批量，追求最低每 token 成本"),budget:17,
  checks:[
   [v=>v.tco>=4,t("Designed for fleet cost (Datacenter ≥ 4)","按机群成本设计（数据中心 ≥ 4）")],
   [v=>v.network>=4,t("Big scale-up domain for large batches and MoE experts (Network ≥ 4)","大 Scale-up 域，装得下大批量和 MoE 专家（网络 ≥ 4）")],
   [(v,p)=>p.A!=="hard",t("Weights can change when the model does","模型换代时权重能跟着换")]]},
 {id:"long",icon:"📚",name:t("Long context","超长上下文"),goal:t("1M-token prompts, many users at once: the KV cache is the problem","百万 token 提示、多用户并发：难点是 KV cache"),budget:19,
  checks:[
   [(v,p)=>p.A==="hbm"||p.A==="tiers",t("Capacity for the KV cache (HBM or memory tiers)","KV cache 放得下（HBM 或多层存储）")],
   [v=>v.runtime>=3.5,t("Runtime that places and moves KV (Runtime ≥ 3.5)","运行时能调度和搬运 KV（运行时 ≥ 3.5）")],
   [(v,p)=>p.E==="pd"||p.E==="afd",t("Long prefill kept away from decode (PD or AFD)","长预填充不拖累解码（PD 或 AFD 分离）")]]},
 {id:"edge",icon:"🔋",name:t("On-device","端侧"),goal:t("A private, always-on assistant on a laptop or phone, at a few watts","笔记本或手机上几瓦功耗、本地私密、随时在线的助手"),budget:12,
  checks:[
   [(v,p)=>p.F==="batt",t("Battery power budget","电池供电预算")],
   [v=>v.network<=1,t("No pod: one chip, shared memory","没有机柜：一颗芯片，共享内存")],
   [v=>v.compiler>=3||v.algorithm>=3,t("Fixed, efficient graphs (Compiler or Algorithm ≥ 3)","图固定、执行高效（编译器或算法 ≥ 3）")]]},
 {id:"many",icon:"🔀",name:t("Many models","多模型"),goal:t("An enterprise platform with 100 fine-tuned models, switching in milliseconds","企业平台托管 100 个微调模型，毫秒级切换"),budget:19,
  checks:[
   [v=>v.runtime>=3,t("Runtime that swaps models fast (Runtime ≥ 3)","运行时能快速换模型（运行时 ≥ 3）")],
   [(v,p)=>p.A==="tiers"||p.A==="hbm",t("Capacity to keep many models nearby","有足够容量把很多模型放在近处")],
   [(v,p)=>p.A!=="hard",t("Programmable, not one model per tape-out","可编程，不是一次流片一个模型")]]},
 {id:"frozen",icon:"🧊",name:t("Frozen model","冻结模型"),goal:t("One model that will not change for years, at the lowest cost per token","一个多年不变的模型，追求最低每 token 成本"),budget:12,
  checks:[
   [v=>v.tco>=4,t("Cost per token over flexibility (Datacenter ≥ 4)","每 token 成本优先于灵活性（数据中心 ≥ 4）")],
   [v=>v.memory>=4,t("Few bytes moved per token (Memory ≥ 4)","每个 token 搬运的字节少（存储 ≥ 4）")],
   [v=>v.network<=3.5,t("No pod needed to hold the model (Network ≤ 3.5)","不需要整个机群才放得下（网络 ≤ 3.5）")]]}
];

/* ---------- mechanisms ---------- set: axis levels (max-combined); cap: axis ceilings; cost: [hardware, compiler, serving] */
const ROWS=[
 {id:"A",q:t("Where do the weights live?","权重放在哪？"),opts:[
  {id:"hbm",l:t("HBM stacks","HBM 堆栈"),set:{memory:2.5},cost:[1,0,1]},
  {id:"sram",l:t("Big on-chip SRAM","大容量片上 SRAM"),set:{memory:5,vlsi:3,network:3.5},cost:[2,2,1]},
  {id:"tiers",l:t("SRAM + HBM + DDR tiers","SRAM + HBM + DDR 三层"),set:{memory:4.5,runtime:3},cost:[2,1,2]},
  {id:"hard",l:t("Hardwired into silicon","模型固化进硅片"),set:{algorithm:5,vlsi:3.5,memory:4},cost:[3,0,0]}]},
 {id:"B",q:t("Who schedules the work?","谁来调度？"),opts:[
  {id:"hw",l:t("Hardware: threads and warps","硬件调度：线程和 warp"),set:{gpu:4.5,cpu:2,runtime:3.5},cost:[2,1,1]},
  {id:"static",l:t("Compiler: static scheduling","编译器静态调度"),set:{compiler:5},cap:{cpu:0.5},cost:[0,3,1]},
  {id:"async",l:t("Hybrid: async tile pipelines","混合：异步 tile 流水线"),set:{gpu:4,compiler:2.5,runtime:3.5},cost:[2,2,1]}]},
 {id:"C",q:t("How big is one machine (scale-up domain)?","一台「机器」有多大（Scale-up 域）？"),opts:[
  {id:"card",l:t("One chip or card","一颗芯片或一张卡"),set:{network:1},cost:[0,0,0]},
  {id:"rack",l:t("Rack scale (copper)","机柜级（铜缆）"),set:{network:4.5,tco:3.5},cost:[2,1,1]},
  {id:"ocs",l:t("Optical-switched pod (OCS)","光交换（OCS）可重构 Pod"),set:{network:5,tco:4.5,runtime:2},cost:[2,1,1]}]},
 {id:"D",q:t("How is compute laid out?","计算怎么排布？"),opts:[
  {id:"simt",l:t("SIMT cores","SIMT 核心"),set:{gpu:5,cpu:1.5},cost:[1,0,0]},
  {id:"systolic",l:t("Systolic matrix units","脉动阵列矩阵单元"),set:{compiler:4,vlsi:2.5,cgra:1.5},cost:[1,1,0]},
  {id:"spatial",l:t("Spatial dataflow fabric","空间数据流架构"),set:{cgra:5,compiler:4},cost:[1,3,0]},
  {id:"wafer",l:t("A whole wafer","整片晶圆"),set:{vlsi:5,cgra:4,memory:4.5},cost:[3,2,0]}]},
 {id:"E",q:t("Disaggregate serving?","推理服务要不要分离？"),opts:[
  {id:"one",l:t("No: one chip type does it all","不分离：一种芯片包办"),set:{},cost:[0,0,1]},
  {id:"pd",l:t("P/D disaggregation (prefill / decode)","PD 分离（预填充 / 解码）"),set:{runtime:4},cost:[0,1,2]},
  {id:"afd",l:t("AFD (attention / FFN disaggregation)","AFD 分离（注意力 / FFN）"),set:{runtime:4.5,network:4.5},cost:[0,1,3]},
  {id:"draft",l:t("Speculative decoding: draft fast, verify big","投机解码：快芯片起草，大芯片验证"),set:{runtime:4,algorithm:2.5},cost:[0,1,2]}]},
 {id:"F",q:t("Power and cooling?","功耗和散热？"),opts:[
  {id:"air",l:t("Air-cooled","风冷"),set:{tco:5},cost:[1,0,0]},
  {id:"liquid",l:t("Liquid-cooled","液冷"),set:{tco:3},cost:[0,0,1]},
  {id:"batt",l:t("Battery, a few watts","电池，几瓦"),set:{tco:4.5,algorithm:2.5},cap:{network:0.5,memory:2.5},cost:[1,1,0]}]}
];
/* Each real-world bet is a combination of buttons (row -> allowed options). It fires only when all rows match. */
const SIG={groq:{A:["sram"],B:["static"],C:["rack"],F:["air"]},
 wse:{A:["sram"],D:["wafer"],F:["liquid"]},
 sn40l:{A:["tiers"],B:["static"],D:["spatial"],E:["one"]},
 v4:{A:["hbm"],B:["static"],C:["ocs"],D:["systolic"]},
 sn50:{A:["tiers"],D:["spatial"],E:["pd"],F:["air"]},
 lpx:{A:["hbm"],B:["async"],C:["rack"],D:["simt"],E:["afd","draft","pd"]},
 v4i:{A:["hbm"],B:["static"],C:["card"],D:["systolic"],F:["air"]},
 m5:{C:["card"],D:["simt"],F:["batt"]}};
const sigHits=()=>Object.keys(SIG).filter(k=>Object.entries(SIG[k]).every(([r,os])=>os.includes(P[r])));
const label=(r,o)=>{const row=ROWS.find(x=>x.id===r);return row.opts.find(x=>x.id===o).l};
const CARDS={
 groq:{n:"Groq LPU",why:t("Porting software to the TPU was hard, so the founders wrote the compiler first and built hardware it could schedule to the cycle.","给 TPU 移植软件很难，所以创始团队先写编译器，再造一颗能让编译器精确到每个周期去调度的硬件。"),
  did:t("No caches or arbiters; 230 MB of SRAM, no DRAM; even chip-to-chip links are in the static schedule.","没有缓存和仲裁器；230 MB SRAM，没有 DRAM；连芯片间链路都写进静态调度。"),
  not:t("Caches and dynamic hardware scheduling, like a GPU.","像 GPU 那样用缓存和硬件动态调度。"),cost:t("A big model needs hundreds of chips; the compiler carries all the complexity. NVIDIA's LPX rack later added DDR5 next to the SRAM.","大模型要几百颗芯片；所有复杂度都压在编译器上。后来英伟达的 LPX 机柜在 SRAM 旁边加了 DDR5。")},
 wse:{n:"Cerebras WSE-3",why:t("In Cerebras's words, connecting hundreds of small chips with wires and cables is the slowdown, so keep everything on one giant piece of silicon.","按 Cerebras 的说法，用线缆连接几百颗小芯片才是瓶颈，那就把一切留在一整块巨大的硅片上。"),
  did:t("A whole wafer, 900K cores routed around defects, 44 GB of SRAM at 21 PB/s.","一整片晶圆，90 万个核心绕开坏点布线，44 GB SRAM、21 PB/s 带宽。"),
  not:t("Many reticle-sized chips with HBM and a network between them.","很多颗光罩尺寸的芯片，配 HBM，再用网络连起来。"),cost:t("Yield, power and liquid cooling need custom engineering; 44 GB caps model size, so big models span several wafers. Cerebras's CS-6 roadmap adds stacked DRAM.","良率、供电、液冷都要专门设计；44 GB 限制了模型大小，大模型得跨好几片晶圆。Cerebras 的 CS-6 路线图加入了堆叠 DRAM。")},
 sn40l:{n:"SambaNova SN40L",why:t("Composition of Experts: many small models, and switching between them was slow.","专家组合：很多小模型，模型之间切换太慢。"),
  did:t("A spatial dataflow chip with three memory tiers: 520 MiB SRAM, 64 GiB HBM, up to 1.5 TiB DDR.","空间数据流芯片，配三层存储：520 MiB SRAM、64 GiB HBM、最多 1.5 TiB DDR。"),
  not:t("Keep every expert in HBM across many GPUs.","把所有专家都放进多块 GPU 的 HBM。"),cost:t("DDR pins on a big chip, and software that decides which model lives where.","大芯片上还要放 DDR 引脚，软件还得决定哪个模型放哪层。")},
 v4:{n:t("Google TPU v4","谷歌 TPU v4"),why:t("At 4,096 chips, a fixed torus is rarely all healthy.","到了 4,096 颗芯片，固定 torus 很难全员健康。"),
  did:t("Optical circuit switches that skip failed units and reshape slices.","用光路交换机跳过坏单元、重新切分。"),
  not:t("A fixed electrical torus, or InfiniBand.","固定的电互连 torus，或者 InfiniBand。"),cost:t("Under 5% of system cost; the scheduler reconfigures slices per job.","不到系统成本的 5%；调度器要按任务重配切片。")},
 v4i:{n:t("Google TPU v4i","谷歌 TPU v4i"),why:t("Deploy in every datacenter; judge by total cost of ownership, not purchase price.","要能部署进每个数据中心；按总拥有成本算账，不按采购价。"),
  did:t("One core, under 400 mm², 175 W, air-cooled, 128 MB on-chip CMEM.","单核，面积不到 400 mm²，175 W，风冷，128 MB 片上 CMEM。"),
  not:t("Reuse the training chip for serving.","直接拿训练芯片来做推理。"),cost:t("Less peak compute; only two chip-to-chip links. Ironwood later went liquid-cooled.","峰值算力更低，只有两条芯片间链路。后来的 Ironwood 改成了液冷。")},
 sn50:{n:"SambaNova SN50",why:t("Agent decode speed matters per user; prefill is compute-heavy and bursty.","Agent 的解码速度按用户算；预填充计算量大、来得猛。"),
  did:t("PD disaggregation: GPUs prefill, SN50 decodes; the KV cache moves once per request.","PD 分离：GPU 做预填充，SN50 做解码；每个请求传一次 KV cache。"),
  not:t("One chip type for both phases.","一种芯片包办两个阶段。"),cost:t("A KV transfer per request and two software stacks; the serving layer pays.","每个请求一次 KV 传输，外加两套软件栈；服务层买单。")},
 lpx:{n:t("NVIDIA Rubin + LPX","英伟达 Rubin + LPX"),why:t("Per-user HBM bandwidth limits interactive decode on the GPU.","GPU 上，每个用户分到的 HBM 带宽限制了交互式解码。"),
  did:t("Groq 3 LPX racks beside Rubin: PD disaggregation, AFD, or speculative decoding.","Groq 3 LPX 机柜放在 Rubin 旁边：PD 分离、AFD 分离或投机解码。"),
  not:t("Make the GPU itself SRAM-heavy.","让 GPU 自己塞满 SRAM。"),cost:t("AFD moves activations every layer, on the critical path; the joint 2T-model result is a projection.","AFD 每层都要传激活，就在关键路径上；2 万亿参数的联合结果还是预测值。")},
 m5:{n:t("Apple M5","苹果 M5"),why:t("Always-on features and bursty LLM work share one chip and one memory. (Apple has not said why; this is my reading.)","常驻功能和突发的大模型任务共用一颗芯片、一块内存。（Apple 没解释原因，这是我的解读。）"),
  did:t("A Neural Engine for efficiency plus a Neural Accelerator in each GPU core for LLMs.","神经网络引擎负责省电，每个 GPU 核心里的 Neural Accelerator 负责大模型。"),
  not:t("Grow the Neural Engine to cover LLMs.","把神经网络引擎做大，让它也能跑大模型。"),cost:t("Two programming paths; decode still limited by 153 GB/s of shared memory.","两条编程路径；解码仍受限于 153 GB/s 的共享内存。")}
};
const PAY=[t("hardware","硬件"),t("compiler","编译器"),t("serving","服务")];

/* ---------- state ---------- */
let C=CONSTRAINTS[0]; const P={};
function vec(PP){PP=PP||P;const v={};AX.forEach(a=>v[a]=0.5);const caps={};
 ROWS.forEach(r=>{const o=r.opts.find(x=>x.id===PP[r.id]);if(!o)return;
  for(const a in o.set)v[a]=Math.max(v[a],o.set[a]);for(const a in (o.cap||{}))caps[a]=Math.min(caps[a]??5,o.cap[a])});
 for(const a in caps)v[a]=Math.min(v[a],caps[a]);return v}
function cost(){const c=[0,0,0];ROWS.forEach(r=>{const o=r.opts.find(x=>x.id===P[r.id]);if(o)o.cost.forEach((x,i)=>c[i]+=x)});return c}
function nearest(v){let best=null,bd=1e9;D.entities.forEach(e=>{let d=0;AX.forEach((a,i)=>d+=(e.scores[i]-v[a])**2);d=Math.sqrt(d);if(d<bd){bd=d;best=e}});return [best,bd]}

/* ---------- drawing ---------- */
function el(tag,a,p){const n=document.createElementNS(NS,tag);for(const k in a)n.setAttribute(k,a[k]);if(p)p.appendChild(n);return n}
function pts(get,cx,cy,R){return ORDER.map((a,i)=>{const g=-Math.PI/2+i*2*Math.PI/10,v=Math.max(0,Math.min(5,get(a)))/5;return[cx+R*v*Math.cos(g),cy+R*v*Math.sin(g)]})}
function frame(svg,cx,cy,R,labels){for(let k=1;k<=5;k++)el("polygon",{class:"cg-ring",points:pts(()=>k,cx,cy,R).join(" ")},svg);
 ORDER.forEach((a,i)=>{const g=-Math.PI/2+i*2*Math.PI/10,c=Math.cos(g),s=Math.sin(g);el("line",{class:"cg-ring",x1:cx,y1:cy,x2:cx+R*c,y2:cy+R*s},svg);
  if(!labels)return;const x=cx+(R+14)*c,y=cy+(R+14)*s+(Math.abs(c)<.2?(s<0?-22:14):-5),an=Math.abs(c)<.2?"middle":c>0?"start":"end";
  const tx=el("text",{x,y,"text-anchor":an,class:"cg-ax"},svg);el("tspan",{x,class:"cg-ax1"},tx).textContent=I.axes[a][0];el("tspan",{x,dy:19,class:"cg-ax2"},tx).textContent=I.axes[a][1]})}

const root=document.getElementById("chip-game"); if(!root)return; root.setAttribute("lang",LANG);
root.innerHTML=`<div class="cg-top"><span class="cg-step">${t("1 · Design scenario","1 · 设计场景")}</span><div class="cg-cons"></div></div>
<div class="cg-row"><div class="cg-left"><div class="cg-step">${t("2 · One mechanism per row","2 · 每行选一个机制")}</div><div class="cg-rows"></div></div>
<div class="cg-right"><div class="cg-step">${t("3 · Shape, bill and fit","3 · 形状、账单、合格与否")}</div><svg class="cg-svg" viewBox="-172 -60 664 520" role="img" aria-label="${t("Your chip's shape","你的芯片形状")}"></svg>
<div class="cg-legend"><span><i class="cg-sw you"></i>${t("your chip","你的芯片")}</span><span><i class="cg-sw near"></i><b class="cg-nn">–</b></span></div><div class="cg-out"></div></div></div><div class="cg-mini"></div><div class="cg-toast" role="status"></div><aside class="cg-drawer" aria-hidden="true"></aside>`;
const consEl=root.querySelector(".cg-cons"),rowsEl=root.querySelector(".cg-rows"),svg=root.querySelector(".cg-svg"),out=root.querySelector(".cg-out");
CONSTRAINTS.forEach(c=>{const b=document.createElement("button");b.className="cg-con";b.innerHTML=`${c.icon} ${c.name}`;b.title=c.goal;b.onclick=()=>{C=c;render()};b.dataset.id=c.id;consEl.appendChild(b)});
ROWS.forEach(r=>{const d=document.createElement("div");d.className="cg-q";d.innerHTML=`<div class="cg-ql">${r.q}</div>`;const g=document.createElement("div");g.className="cg-opts";
 r.opts.forEach(o=>{const b=document.createElement("button");b.className="cg-opt";b.textContent=o.l;b.dataset.r=r.id;b.dataset.o=o.id;b.onclick=()=>{const before=new Set(sigHits());const on=P[r.id]!==o.id;P[r.id]=on?o.id:undefined;render();const nw=sigHits().filter(k=>!before.has(k));if(nw.length)hit(nw[0])};g.appendChild(b)});
 d.appendChild(g);rowsEl.appendChild(d)});
const reset=document.createElement("button");reset.className="cg-reset";reset.textContent=t("reset","重来");reset.onclick=()=>{ROWS.forEach(r=>delete P[r.id]);render()};rowsEl.appendChild(reset);

function render(){
 consEl.querySelectorAll(".cg-con").forEach(b=>b.classList.toggle("on",b.dataset.id===C.id));
 rowsEl.querySelectorAll(".cg-opt").forEach(b=>b.classList.toggle("on",P[b.dataset.r]===b.dataset.o));
 const v=vec(),n=ROWS.filter(r=>P[r.id]).length,[ne,nd]=nearest(v);
 svg.innerHTML="";frame(svg,160,195,150,true);
 if(n>=3){el("polygon",{class:"cg-near",points:pts(a=>ne.scores[AX.indexOf(a)],160,195,150).join(" ")},svg)}
 const yp=pts(a=>v[a],160,195,150);el("polygon",{class:"cg-you",points:yp.join(" ")},svg);yp.forEach(q=>el("circle",{class:"cg-dot",cx:q[0],cy:q[1],r:4},svg));
 root.querySelector(".cg-nn").textContent=n>=3?`${t("closest real chip","最接近的真实芯片")}: ${nm(ne)}`:t("closest chip: after 3 picks","最接近的芯片：选满 3 行后显示");
 const c=cost(),tot=c[0]+c[1]+c[2],mx=Math.max(C.budget*1.25,tot);
 const bars=c.map((x,i)=>`<div class="cg-bar"><span>${PAY[i]}</span><div class="cg-track"><div class="cg-fill f${i}" style="width:${x/mx*100}%"></div></div><b>${x}</b></div>`).join("");
 const over=tot-C.budget;
 const budget=n===0?"":over>=5?`<p class="cg-warn">${t(`Over budget by ${over}. Everyone got what they asked for. This is how a committee chip is born.`,`超出预算 ${over} 点。每个人的要求都满足了，十项全满分的芯片就是这么开会开出来的。`)}</p>`:over>0?`<p class="cg-warn">${t(`Over budget by ${over}. Something has to give: which row would you change?`,`超出预算 ${over} 点。总得放弃点什么：你会改哪一行？`)}</p>`:`<p class="cg-ok">${t(`Within budget (${tot} of ${C.budget}).`,`预算之内（${tot} / ${C.budget}）。`)}</p>`;
 const checks=C.checks.map(([f,l])=>{const ok=n>0&&f(v,P);return `<li class="${n===0?"":ok?"y":"n"}">${n===0?"○":ok?"✓":"✗"} ${l}</li>`}).join("");
 const cards=sigHits();
 const cardHtml=cards.length?`<p class="cg-cards">${t("Real teams made this bet:","真实团队押过同样的注：")} ${cards.map(k=>`<a href="#card-${k}" data-card="${k}">${CARDS[k].n} →</a>`).join(" ")}</p>`:"";
 const okN=n?C.checks.filter(([f])=>f(v,P)).length:0;root.querySelector(".cg-mini").innerHTML=n?`${C.icon} ${n>=3?nm(ne)+" · ":""}${t("bill","账单")} ${tot}/${C.budget} · ${t("checks","检查")} ${okN}/3`:t("Pick options below; the result shows here.","在下面选选项，结果显示在这里。");
 out.innerHTML=`<div class="cg-pay">${bars}<div class="cg-bar tot"><span>${t("total","合计")}</span><div class="cg-track"><div class="cg-fill ftot${over>0?" over":""}" style="width:${tot/mx*100}%"></div><div class="cg-budget" style="left:${C.budget/mx*100}%"></div></div><b>${tot}</b></div></div>${budget}<ul class="cg-checks"><li class="cg-goal">${C.icon} ${C.name}: ${C.goal}</li>${checks}</ul>${cardHtml}<p class="cg-found">${t("Real-world bets found","已找到的真实案例")}: <b>${FOUND.size}</b> / ${Object.keys(CARDS).length}</p>`;
 out.querySelectorAll("a[data-card]").forEach(a=>a.onclick=ev=>{ev.preventDefault();openCard(a.dataset.card)});
}
const FOUND=new Set(),toast=root.querySelector(".cg-toast"),drawer=root.querySelector(".cg-drawer");let tt;
function hit(k){const isNew=!FOUND.has(k);FOUND.add(k);render();
 toast.innerHTML=`<b>${isNew?t("🎯 You hit a real-world bet!","🎯 你押中了一个真实案例！"):t("🎯 Real-world bet","🎯 真实案例")}</b> ${t(`${CARDS[k].n} made this combination.`,`${CARDS[k].n} 选过这一组按钮。`)} <button class="cg-why">${t("Why? →","为什么？→")}</button>`;
 if(isNew&&FOUND.size===Object.keys(CARDS).length)toast.innerHTML+=`<br>${t("🏆 All eight real-world bets found. You have designed every chip in the deck.","🏆 八个真实押注全部找到。整副牌里的芯片，你都设计过一遍了。")}`;
 toast.classList.add("on");toast.querySelector(".cg-why").onclick=()=>openCard(k);clearTimeout(tt);tt=setTimeout(()=>toast.classList.remove("on"),5000)}
function openCard(k){const c=CARDS[k];const combo=Object.entries(SIG[k]).map(([r,os])=>label(r,os.includes(P[r])?P[r]:os[0])).join(" + ");toast.classList.remove("on");
 drawer.innerHTML=`<button class="cg-x" aria-label="close">✕</button><div class="cg-dk">${t("Real-world bet","真实案例")}</div><h4>${c.n}</h4><div class="cg-dbtn">${t("Combination: ","组合：")}${combo}</div>
 <dl><dt>${t("Why","为什么")}</dt><dd>${c.why}</dd><dt>${t("What they built","他们怎么做")}</dt><dd>${c.did}</dd><dt>${t("Not taken","没选的方案")}</dt><dd>${c.not}</dd><dt>${t("Who pays","谁来买单")}</dt><dd>${c.cost}</dd></dl>
 <a class="cg-full" href="#card-${k}">${t("Full card with sources ↓","完整卡片和出处 ↓")}</a>`;
 drawer.classList.add("on");drawer.setAttribute("aria-hidden","false");
 drawer.querySelector(".cg-x").onclick=closeCard;drawer.querySelector(".cg-full").onclick=ev=>{ev.preventDefault();closeCard();showCard(k,true)}}
function closeCard(){drawer.classList.remove("on");drawer.setAttribute("aria-hidden","true")}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCard()});
render();

/* ---------- answer sheet: the eight real-world bets ---------- */
const CC=(window.CHIP_CARDS||{})[LANG]||{},sheet=document.getElementById("chip-cards");let showCard=()=>{};
if(sheet&&Object.keys(CC).length){
 const keys=Object.keys(SIG).filter(k=>CC[k]);
 sheet.setAttribute("lang",LANG);
 sheet.innerHTML=`<div class="cc-top"><label for="cc-sel">${t("Real-world bet","真实案例")}</label><select id="cc-sel">${keys.map((k,i)=>`<option value="${k}">${i+1}. ${CC[k].title}</option>`).join("")}</select></div><div class="cc-body"></div>`;
 const sel=sheet.querySelector("#cc-sel"),body=sheet.querySelector(".cc-body");
 showCard=(k,scroll)=>{sel.value=k;const c=CC[k],PP={};Object.entries(SIG[k]).forEach(([r,os])=>PP[r]=os[0]);const v=vec(PP);
  body.innerHTML=`<div class="cc-row"><div class="cc-left"><svg class="cc-svg" viewBox="-172 -60 664 520"></svg><div class="cc-combo"><b>${t("Combination","组合")}</b>${Object.entries(SIG[k]).map(([r,os])=>`<span class="cc-chip">${os.map(o=>label(r,o)).join(t(" or "," 或 "))}</span>`).join("")}</div>
  <button class="cc-try">${t("Load this combination into the game ↑","把这组按钮放进游戏 ↑")}</button></div>
  <div class="cc-right"><dl>${c.bullets.map(([l,h])=>`<dt>${l}</dt><dd>${h}</dd>`).join("")}</dl><p class="cc-src">${t("Sources: ","出处：")}${c.src}</p></div></div>`;
  const svg=body.querySelector(".cc-svg");frame(svg,160,195,150,true);const yp=pts(a=>v[a],160,195,150);el("polygon",{class:"cg-you",points:yp.join(" ")},svg);yp.forEach(q=>el("circle",{class:"cg-dot",cx:q[0],cy:q[1],r:4},svg));
  body.querySelector(".cc-try").onclick=()=>{ROWS.forEach(r=>delete P[r.id]);Object.assign(P,PP);render();root.scrollIntoView({behavior:"smooth"})};
  if(scroll)sheet.scrollIntoView({behavior:"smooth"})};
 sel.onchange=()=>showCard(sel.value);showCard(keys[0]);
}

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
