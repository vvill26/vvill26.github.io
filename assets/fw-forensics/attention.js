/* New GitHub stars per half-year, grouped by origin. Data: window.FW_ATT. Language: window.FW_LANG ('en' | 'zh'). */
(function(){
const D = window.FW_ATT, LANG = window.FW_LANG || "en";
const L = {
  en: { abs: "New stars", share: "Share of new stars", y_abs: "new GitHub stars per half-year", y_share: "share of new stars",
        two: "Numbers on the bars: the two lineages (ggml + Berkeley/LMSYS) combined.", partial: "* 2026-H2 is partial (readings from mid-July to 15 Nov)", total: "total",
        hint: "Hover a bar segment for the repositories behind it.",
        g: { lmsys: "Berkeley / LMSYS (vLLM, SGLang)", ggml: "ggml (llama.cpp, Ollama)", nvidia: "NVIDIA (TensorRT-LLM, Triton, Dynamo)",
             compiler: "Compiler line (MLC-LLM, Modular)", platform: "Platform owners (MLX, ExecuTorch, LiteRT, ONNX Runtime, OpenVINO)",
             other: "Other (TGI, LMDeploy, Ray, KServe, TorchServe, TF Serving, llm-d)" } },
  zh: { abs: "新增 star", share: "新增 star 占比", y_abs: "每半年新增 GitHub star", y_share: "新增 star 占比",
        two: "柱上的数字：两条血统（ggml + Berkeley/LMSYS）合计。", partial: "* 2026-H2 未满半年（读数截至 7 月中旬到 11 月 15 日不等）", total: "合计",
        hint: "悬停在色块上，看背后是哪几个仓库。",
        g: { lmsys: "Berkeley / LMSYS（vLLM、SGLang）", ggml: "ggml（llama.cpp、Ollama）", nvidia: "英伟达（TensorRT-LLM、Triton、Dynamo）",
             compiler: "编译器路线（MLC-LLM、Modular）", platform: "平台方（MLX、ExecuTorch、LiteRT、ONNX Runtime、OpenVINO）",
             other: "其他（TGI、LMDeploy、Ray、KServe、TorchServe、TF Serving、llm-d）" } }
}[LANG];
const ORDER = ["ggml","lmsys","nvidia","compiler","platform","other"];
const NS = "http://www.w3.org/2000/svg";
const el = (t,a={},p) => { const n=document.createElementNS(NS,t); for(const k in a) n.setAttribute(k,a[k]); if(p) p.appendChild(n); return n; };
const h = (t,a={},p,txt) => { const n=document.createElement(t); for(const k in a) n.setAttribute(k,a[k]); if(txt!=null) n.textContent=txt; if(p) p.appendChild(n); return n; };
const root = document.getElementById("fw-attention"); if(!root) return;
root.setAttribute("lang",LANG);
const tip = h("div",{class:"fa-tip",role:"status"},document.body);
const ctl = h("div",{class:"fa-ctl"},root);
let mode = "abs";
const bA = h("button",{class:"fa-btn on"},ctl,L.abs), bS = h("button",{class:"fa-btn"},ctl,L.share);
bA.onclick=()=>{mode="abs";bA.classList.add("on");bS.classList.remove("on");draw();};
bS.onclick=()=>{mode="share";bS.classList.add("on");bA.classList.remove("on");draw();};
const W=720, H=380, x0=56, y0=20, pw=W-x0-12, ph=H-y0-60;
const svg = el("svg",{viewBox:`0 0 ${W} ${H}`,class:"fa-svg",role:"img","aria-label":L.y_abs},root);
const leg = h("div",{class:"fa-leg"},root);
ORDER.slice().reverse().forEach(k=>{ const i=h("span",{class:"fa-li"},leg); h("span",{class:"fa-sw g-"+k},i); h("span",{},i,L.g[k]); });
const note=h("div",{class:"fa-note"},root);
const sum = o => Object.values(o).reduce((s,v)=>s+v,0);
const P = D.periods.map(p=>{ const g={}; ORDER.forEach(k=>g[k]=sum(p.g[k]||{})); return {p:p.p, partial:p.partial, g, raw:p.g, t:sum(g)}; });
function nice(m){ const s=[5e3,1e4,2e4,25e3,5e4]; for(const v of s) if(m/v<=5) return v; return 25e3; }
function draw(){
  svg.innerHTML=""; note.textContent=(mode==="share"?L.two+" ":"")+L.partial+" · "+L.hint;
  const max = mode==="abs" ? Math.max(...P.map(p=>p.t)) : 1;
  const step = mode==="abs" ? nice(max) : 0.25, top = mode==="abs" ? Math.ceil(max/step)*step : 1;
  const Y = v => y0 + ph - v/top*ph;
  for(let v=0; v<=top+1e-9; v+=step){ el("line",{x1:x0,x2:W-12,y1:Y(v),y2:Y(v),class:"fa-grid"},svg);
    el("text",{x:x0-6,y:Y(v)+4,class:"fa-tick","text-anchor":"end"},svg).textContent = mode==="abs" ? (v>=1000? (v/1000)+"k" : v) : Math.round(v*100)+"%"; }
  const t = el("text",{x:12,y:y0+ph/2,class:"fa-ax",transform:`rotate(-90 12 ${y0+ph/2})`,"text-anchor":"middle"},svg); t.textContent = mode==="abs"?L.y_abs:L.y_share;
  const band = pw/P.length, bw = band*0.68;
  P.forEach((p,i)=>{
    const x = x0 + i*band + (band-bw)/2; let acc=0;
    ORDER.forEach(k=>{ const v = mode==="abs" ? p.g[k] : (p.t? p.g[k]/p.t : 0); if(!v) return;
      const r = el("rect",{x, y:Y(acc+v), width:bw, height:Math.max(0,Y(acc)-Y(acc+v)), class:"fa-bar g-"+k+(p.partial?" part":""), tabindex:"0"},svg);
      const show = ev => { const repos = Object.entries(p.raw[k]||{}).filter(e=>e[1]).sort((a,b)=>b[1]-a[1]).map(([n,c])=>`${n} ${c.toLocaleString()}`).join("<br>");
        tip.innerHTML = `<b>${p.p}</b> · ${L.g[k]}<br>${p.g[k].toLocaleString()} (${p.t?Math.round(100*p.g[k]/p.t):0}%)<div class="fa-tw">${repos}</div>`;
        tip.style.display="block"; let cx=ev.clientX, cy=ev.clientY; if(cx==null){ const b=ev.target.getBoundingClientRect(); cx=b.right; cy=b.top; }
        tip.style.left=Math.min(cx+14, window.innerWidth-300)+"px"; tip.style.top=(cy+14)+"px"; };
      ["mouseenter","mousemove","focus"].forEach(e=>r.addEventListener(e,show)); ["mouseleave","blur"].forEach(e=>r.addEventListener(e,()=>tip.style.display="none"));
      acc += v; });
    if(mode==="share" && p.t && (p.g.lmsys+p.g.ggml)>0){ const s=(p.g.lmsys+p.g.ggml)/p.t;
      el("text",{x:x+bw/2,y:Y(s)-4,class:"fa-val","text-anchor":"middle"},svg).textContent = Math.round(s*100)+"%"; }
    if(mode==="abs" && p.t>=40000) el("text",{x:x+bw/2,y:Y(p.t)-4,class:"fa-val","text-anchor":"middle"},svg).textContent = Math.round(p.t/1000)+"k";
    const lt = el("text",{x:x+bw/2,y:y0+ph+16,class:"fa-tick","text-anchor":"end",transform:`rotate(-45 ${x+bw/2} ${y0+ph+16})`},svg); lt.textContent=p.p;
  });
}
draw();
})();
