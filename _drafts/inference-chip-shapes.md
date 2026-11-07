---
layout: post
title: "The shape of an inference chip: 40 chips, 10 axes, one radar"
date: 2026-11-07 09:00:00 +0800
permalink: /2026/11/inference-chip-shapes/
lang: en
description: "Every inference chip is a bet placed by people with a particular background. Scoring 40 chips and five mixed GPU-plus-accelerator systems on ten design axes shows which bets each one made, and why their shapes look so different."
---

{% include lang-switch.html en="/2026/11/inference-chip-shapes/" zh="/zh/2026/11/inference-chip-shapes/" %}

<link rel="stylesheet" href="/assets/chip-radar/radar.css">

*A long read. Use the contents to jump around; the [interactive radar](#radar) is the centrepiece and works on its own.*

<nav class="toc" markdown="1">
**Contents**

1. [A chip is shaped by who designed it](#idea)
2. [Ten axes, and how they were scored](#axes)
3. [The interactive radar](#radar)
4. [Google TPU: eleven chips, one constant](#tpu)
5. [The challengers: four ways to avoid the GPU](#challengers)
6. [Hyperscalers' own chips: designed from the bill](#hyperscalers)
7. [Merchant GPUs: the generalists that keep growing](#gpus)
8. [Heterogeneous systems: when one shape is not enough](#hetero)
9. [Cloud, edge and PC: same axes, different priorities](#deploy)
10. [Seven families, and what each one fears](#families)
11. [What this means for compilers and runtimes](#software)
12. [Caveats](#caveats)
13. [Sources](#sources)
</nav>

## 1. A chip is shaped by who designed it {#idea}

A recent [NeuralTalk article](https://mp.weixin.qq.com/s/TFExyhdJsxa7inerxCe8IQ) made a simple observation: you can often tell an AI chip team's background from the chip. People who came from GPUs build something with threads and register files. Compiler people remove hardware arbitration so the compiler can see every cycle. Physical-design people attack the wires. Datacenter people start from the electricity bill.

That is a useful lens because it explains *why* chips differ, not only *how*. Spec sheets tell you TFLOPS and bandwidth. They do not tell you which problem the designers thought was the hard one.

This article turns the lens into numbers. I took the article's nine background angles, added a tenth (CGRA / FPGA spatial dataflow, which is clearly its own school), and scored 40 inference-relevant chips from 2015 to 2026 on each one. Then I scored five *heterogeneous* systems, where a GPU and a different accelerator share a request, because that is where the industry went in 2026.

One warning before the charts. **A bigger radar is not a better chip.** Each axis measures how strongly one background's instinct shaped the chip's defining decisions. A chip that scores 5 on everything would be a committee design. The interesting part is the shape.

## 2. Ten axes, and how they were scored {#axes}

Each axis runs from 0 to 5. The question is always the same: *how strongly does this background shape the chip's defining design decisions?*

| Axis | 0 means | 5 means |
|---|---|---|
| **VLSI / physical** | conventional big die, no physical bet | the physical implementation *is* the architecture (wafer scale, built-in redundancy) |
| **CPU** | no general control cores, no caches | a CPU with a matrix unit attached |
| **GPU** | no SIMT, not generally programmable | full SIMT, warps, CUDA-class programmability |
| **Runtime / serving** | the host drives everything | the chip is designed as a serving machine (KV paging, request scheduling, prefill/decode) |
| **Compiler** | hardware discovers all dependencies | fully compiler-orchestrated: no interlocks, the compiler knows every cycle |
| **CGRA / dataflow** | time-multiplexed cores | the chip is a spatial fabric; whole graphs mapped in space |
| **Algorithm** | generic datapath | the model itself is in silicon |
| **Network / distributed** | single-device thinking | the machine is the pod |
| **Memory / package / PHY** | memory follows convention | the chip is built around bytes per token (all-SRAM, in-memory compute) |
| **Datacenter / TCO** | peak FLOPS first | designed from the owner's fleet economics outward |

The full rubric also defines anchors at 1 and 3, so that "3" means the same thing on every axis.

**Method.** Research came from public sources only: vendor papers and blogs, Hot Chips 2025 and 2026 coverage, ISCA papers, cloud documentation and reputable technical press. Two independent scoring passes then used the same rubric. One went chip by chip, the other axis by axis, ranking all chips on one axis before moving on. Each score carries a one-line reason, a source and a confidence level (high for a paper or spec, medium for vendor claims or secondary analysis, low for inference). The final score is the average of the two passes; the confidence is the lower of the two.

The passes agreed closely: 317 of 450 scores matched exactly, and only 3 differed by a full point. Part of that agreement comes from shared research notes, so treat it as consistency, not proof. The [caveats](#caveats) cover this.

## 3. The interactive radar {#radar}

Pick up to three chips to overlay, browse every chip's fingerprint, play the TPU timeline, look inside a heterogeneous system, or compare deployment scenarios. Hover any point to see the score, the confidence and the reason.

<div id="chip-radar"></div>
<script src="/assets/chip-radar/data.js"></script>
<script src="/assets/chip-radar/radar.js"></script>

*Default view: TPU v7 Ironwood, NVIDIA Groq 3 LP30 and NVIDIA Rubin. Three very different bets on the same problem.*

## 4. Google TPU: eleven chips, one constant {#tpu}

The TPU line is the best natural experiment we have: one company, one software stack, eleven chips over ten years. Press play on the TPU timeline in the radar and watch what moves.

**What never changes: the compiler.** Every TPU scores 4.5 on Compiler, from the 2015 int8 coprocessor to the 2026 TPU 8i. TPUs use big systolic matrix units, VLIW instruction bundles and software-managed memory, and the XLA compiler schedules all of it. They stop short of a 5 only because transfers to and from HBM run asynchronously and software waits on sync flags. Ten years and a dozen process nodes later, Google never gave scheduling back to the hardware.

**What changes: the network.** TPU v1 was a single PCIe card (Network 0). TPU v2 turned it into a training node with a torus interconnect (3). TPU v4 added optical circuit switching and made the pod the machine (5). Every flagship TPU since has stayed at 5, up to Ironwood's 9,216-chip pods and the eighth-generation TPU 8t built for million-chip training jobs.

**The quiet second branch: cost.** TPU v4i, v5e and v6e are not scaled-down flagships. They are TCO-first designs: air-cooled, smaller pods, less HBM, priced per dollar and per watt. They score 4.5 to 5 on TCO and only 1 to 3 on Network. Google was running two roadmaps long before it said so.

**2026: the split becomes explicit.** The eighth generation is two chips. TPU 8t is a training machine. TPU 8i is Google's first latency-first inference TPU, with much more on-chip SRAM, a lower-diameter network and collectives in the network. Its Memory score rises to 4 and Runtime to 3.5, the highest of any TPU. The shape that started as "compiler plus fleet economics" has grown a serving machine on top.

## 5. The challengers: four ways to avoid the GPU {#challengers}

The startups are where the shapes get extreme, because each one bet on a single idea.

**Deterministic and all-SRAM: Groq.** Groq's chip, which Groq calls a tensor streaming processor, is the purest compiler machine in this study: Compiler 5, Memory 5, CPU 0. There are no caches, no arbiters and no interlocks; even the chip-to-chip network is part of the static schedule. Weights live in on-chip SRAM, spread across many chips. The cost of this purity shows on Runtime (under 1 for gen 1): the hardware does nothing dynamic, so everything dynamic is the host's problem. In 2026 NVIDIA licensed the technology and recast it as the [Groq 3 LP30](https://developer.nvidia.com/blog/inside-nvidia-groq-3-lpx-the-low-latency-inference-accelerator-for-the-nvidia-vera-rubin-platform), a decode co-processor inside Vera Rubin racks. Its own shape barely changed. Its job did ([section 8](#hetero)).

**Wafer scale: Cerebras.** Cerebras is the physical-design school taken to its limit: VLSI 5, Memory 5. The bet is to keep everything on one giant SRAM-rich wafer and avoid the network altogether, which is why WSE-2 scores only 2 to 2.5 on Network. With WSE-3 and the move to rack-scale systems shown at [Hot Chips 2026](https://www.servethehome.com/cerebras-talks-going-rack-scale-with-their-wses-at-hot-chips-2026/), Network rises to 3, and the wafer increasingly serves as a decode engine paired with someone else's prefill.

**Spatial dataflow: SambaNova.** SambaNova is the CGRA school: CGRA 5. Its reconfigurable dataflow unit maps whole graph regions onto a fabric in space and streams activations between units, backed by a three-tier memory (SRAM, HBM and large DDR). That combination suits serving many models at once. The [SN50](https://sambanova.ai/blog/introducing-the-sn50-rdu-purpose-built-for-agentic-inference) keeps the shape but repositions it: air-cooled, Ethernet scale-up built in, aimed at decode.

**Bytes per token: Taalas, Etched, d-Matrix.** These three start from the memory wall rather than the compute unit.
- [Taalas HC1](https://www.jonpeddie.com/news/amd-buys-taalas-and-a-very-different-idea-about-ai-inference/) is the extreme: the model's weights are wired into the chip. It is the only Algorithm 5 in the study, with Memory 5 and Network 0.5. AMD [agreed to acquire Taalas](https://ir.amd.com/news-events/press-releases/detail/1296) in August 2026, describing the technology as a complement to its Instinct GPUs.
- Etched Sohu runs only transformers (Algorithm 4.5). It has the least public technical detail of any chip here, so treat its shape as low confidence.
- d-Matrix [Corsair](https://www.servethehome.com/d-matrix-presents-corsair-an-in-memory-computing-architecture-for-inference-at-hot-chips-2025/) computes inside SRAM (Memory 5). The announced [Raptor](https://servethehome.com/d-matrix-raptor-3d-dram-accelerator-for-generative-inference-at-hot-chips-2026) stacks custom DRAM on logic and is planned to sit inside NVIDIA racks.

**The odd one out: Tenstorrent.** [Blackhole](https://www.theregister.com/2024/08/27/tenstorrent_ai_blackhole/) has the highest CPU score among the datacenter chips (3.5): over 750 small RISC-V cores driving the compute tiles plus 16 Linux-capable ones, Ethernet on every chip, an open software stack. It is the CPU architect's answer: make the accelerator a many-core computer and let software decide the rest.

## 6. Hyperscalers' own chips: designed from the bill {#hyperscalers}

Meta, AWS and Microsoft own the workloads and pay the power bill, and their shapes show it. Datacenter/TCO is their highest axis: Maia 200 and MTIA 2i score 5, and Trainium3 scores 4.5.

The details differ by owner:
- **Meta MTIA** has a surprisingly high CPU score (3). Its processing elements carry RISC-V cores and caches, because its first job was recommendation ranking, which is full of irregular control flow. The [MTIA 300/400 roadmap](https://www.storagereview.com/news/metas-mtia-roadmap-four-chip-generations-in-two-years-put-genai-inference-first) moves to chiplets, HBM and 72-chip racks for generative AI.
- **AWS Inferentia2 and Trainium3** look like a cousin of the TPU: Compiler 4, with separate engines synchronized by the compiler and memory managed in software. They scale through switched UltraServers designed around EC2 pricing.
- **Microsoft Maia 200** is the clearest "inference economics" chip: software-managed SRAM, FP4 and Ethernet scale-up on the die. Microsoft's [architecture deep dive](https://techcommunity.microsoft.com/blog/azureinfrastructureblog/deep-dive-into-the-maia-200-architecture/4489312) reads like a TCO model with a chip attached.

## 7. Merchant GPUs: the generalists that keep growing {#gpus}

The GPU shape is the mirror image of Groq's: GPU 5, Compiler 1.5, CGRA 0.5 to 1.25. The hardware hides latency with threads and occupancy, so the compiler does not have to know every cycle. That is exactly why the GPU runs everything.

The interesting story is how the GPU shape *grows*:

| | Runtime | Network | Memory | Datacenter / TCO |
|---|---|---|---|---|
| H100 (2022) | 3.5 | 3 | 1.75 | 1.75 |
| B200 (2024) | 3.5 | 4 | 2.25 | 3.25 |
| Rubin (2026) | 4.5 | 4.5 | 3.25 | 4 |

Rubin is no longer a chip so much as a rack-scale serving platform. It has six co-designed chips, HBM4, tiered KV-cache storage and NVIDIA's Dynamo serving software. Meanwhile its GPU score drops slightly (from 5 to 4.5), because Blackwell and Rubin move matrix work into asynchronous tile engines that sit somewhat outside the classic SIMT model. The generalist is absorbing the other schools one axis at a time.

AMD follows the same path from a different start. MI300X led with chiplets and memory capacity per dollar (VLSI 3.75). [MI455X and Helios](https://www.storagereview.com/news/amd-mi455x-and-helios-432gb-hbm4-72-gpu-racks-and-a-real-answer-to-vera-rubin) add the most HBM per GPU and Ethernet-based scale-up.

Huawei's Ascend line is shaped by supply constraints. The 910C scores only 1 on TCO but 4.75 on Network: it compensates for weaker individual chips with a very large optical supernode. The Ascend 950 keeps that network and adds a SIMT-style programming path (GPU 3).

## 8. Heterogeneous systems: when one shape is not enough {#hetero}

The biggest change in 2026 is not a new chip shape. It is systems that combine two shapes in one request path. Open the *Heterogeneous* tab in the radar: filled shapes are the components, and the dashed outline is the system as deployed.

| System | First component | Second component | How the work splits |
|---|---|---|---|
| NVIDIA Vera Rubin NVL72 + Groq 3 LPX | Rubin GPUs | Groq 3 LPUs | GPUs hold attention and KV cache; LPUs run decode FFN/MoE layers, handing off every token |
| AWS Trainium + Cerebras CS-3 | Trainium | Cerebras wafer | Prefill on Trainium, decode on the wafer, KV cache moved over EFA |
| SambaNova SN50 + GPU | H200-class GPUs | SN50 | GPUs do prefill only; the dataflow chip does decode |
| d-Matrix Corsair + GPU (via Gimlet) | GPUs | Corsair cards | Software sends part of each request (such as draft decoding) to in-memory-compute cards |
| Cerebras wafer + AMD MI455X (planned) | MI455X | Cerebras wafer | Wafer decode beside HBM-rich GPUs; announced, not shipping |

Three things stand out in the scores.

**The union shape is large, and that is the point.** Vera Rubin plus LPX scores 5 on Runtime, Network and Memory at the same time. HBM holds the KV cache and SRAM streams the weights. No single chip in this study does both.

**The compiler score drops.** The system's Compiler score (3.25) sits between the LPU's 5 and the GPU's 2, because half the system is scheduled statically and half dynamically. Someone has to manage the boundary.

**Runtime becomes the hardest axis.** Every shipping or announced heterogeneous system scores 4 or higher on Runtime (the planned Cerebras + MI455X system scores 3.5 only because its serving software is not yet public). The difficult part is no longer inside either chip. It is deciding which phase, which layer and which token goes where, and moving the KV cache or activations between them fast enough. NVIDIA's [description of the LPX design](https://developer.nvidia.com/blog/inside-nvidia-groq-3-lpx-the-low-latency-inference-accelerator-for-the-nvidia-vera-rubin-platform) splits attention and FFN within each token, and [Cerebras's disaggregation write-up](https://www.cerebras.ai/blog/disaggregated-inference) splits prefill and decode. They are two levels of the same idea.

This also changes how to read the challengers. A chip that looked too narrow on its own, such as an all-SRAM decoder or a wafer with no network, becomes very useful once a GPU handles everything it is bad at. AMD's stated reason for buying Taalas, complementing its GPUs, is the same logic.

## 9. Cloud, edge and PC: same axes, different priorities {#deploy}

The *Cloud vs edge* tab averages the shapes by deployment scenario.

| Scenario | Chips | Highest axes | Lowest axes |
|---|---|---|---|
| Cloud, inference-first | 14 | Compiler 3.9, Memory 3.9, TCO 3.9 | GPU 0.8, CPU 0.9 |
| Cloud, training + inference | 20 | Network 3.7, Compiler 3.4, TCO 3.4 | CPU 1.5, CGRA 1.9 |
| Edge, PC and phone | 6 | TCO 4.2, Compiler 3.7 | Network 0, GPU 0.8 |

For the edge rows, TCO means energy and cost per token, since there is no fleet.

Three observations:
- **The GPU axis is almost empty outside training-capable cloud chips.** Inference-first chips, cloud or edge, average under 1. If you design only for inference, SIMT generality is the first thing you drop.
- **Memory separates the cloud inference chips.** Cloud inference chips average 3.9 on Memory; training chips 2.7; edge 2.1. In the datacenter, decode is limited by bytes per token, and the inference specialists are built around that.
- **On the edge, the network disappears and the compiler stays.** Laptop and phone NPUs (Apple's Neural Engine, Qualcomm's Hexagon, AMD's XDNA 2, Intel's NPU 5, Hailo-10H, Google's Tensor G5) have no scale-out, so their shapes collapse to compiler, energy and on-chip memory. XDNA 2 is a full CGRA (4.5) that came from Xilinx. Hexagon is a VLIW DSP with real CPU machinery (CPU 3.5). Apple's Neural Engine is a closed engine reachable only through Core ML. Edge vendors disclose the least, so these shapes carry the lowest confidence.

## 10. Seven families, and what each one fears {#families}

The *All chips* tab groups every fingerprint into seven families. Read each shape as the designers' answer to the question "what is the hard part?"

1. **Compiler-first, designed from the fleet** (TPUs, Inferentia/Trainium, Maia). *Fear: the bill.* Average Compiler 4.4, TCO 4.3. The owner runs the workload, so static schedules and software-managed memory are worth the compiler effort.
2. **Deterministic, all-SRAM** (Groq). *Fear: unpredictability.* Compiler 5, Memory 5, CPU 0. Remove everything dynamic, then live with a host that has to handle all of it.
3. **Spatial dataflow and wafer scale** (Cerebras, SambaNova). *Fear: moving data off the chip.* CGRA 4.6, Memory 4.7, VLSI 4.0. Keep activations on the fabric.
4. **Bytes-per-token bets** (Taalas, Etched, d-Matrix). *Fear: the memory wall.* Memory 4.4, Algorithm 3.6. Give up generality to cut the bytes that move per token.
5. **CPU-flavoured many-core** (Tenstorrent, MTIA). *Fear: workloads you did not plan for.* CPU 3.2. Keep enough general control to run whatever comes next.
6. **Generalist GPUs** (NVIDIA, AMD, Huawei). *Fear: losing the developer.* GPU 4.0, Network 4.0, Runtime 3.4. Keep programmability, then add fabric, memory and serving software each generation.
7. **On-device NPUs**. *Fear: the battery.* Network 0, TCO 4.2. Energy per token decides everything.

None of these fears is wrong. They are different answers to the question of what will be scarce: compute, memory bandwidth, power, developer time or flexibility. Heterogeneous systems exist because the honest answer is "all of them, in different phases of the same request".

## 11. What this means for compilers and runtimes {#software}

For people who work on the software stack (compilers, vLLM, SGLang), three conclusions follow.

**First, "the compiler" means different jobs on different shapes.** On a Groq-style chip the compiler is the scheduler, down to the cycle and across chips. On a TPU or Trainium it manages memory and synchronization explicitly. On a GPU it mostly generates good kernels and leaves scheduling to the hardware. On a CGRA it does placement and routing. A single compiler architecture can serve all four only if it is honest about which of these jobs it is doing.

**Second, the runtime is the axis that is rising fastest.** It climbs across the GPU generations, on the TPU 8i, and on every heterogeneous system. The serving engine used to be a layer above the hardware. It is becoming part of the hardware design: KV-cache tiering, prefill and decode placement, and per-token handoff between chip types. vLLM and SGLang already treat prefill-decode disaggregation as a first-class feature. The next step is a scheduler that understands different chip types, not just different nodes.

**Third, the static-dynamic boundary is now a system-design problem.** When a deterministic chip and a dynamic chip share a token, someone has to translate between a cycle-exact schedule and a world of variable batch sizes and arrival times. That translation layer does not belong cleanly to the compiler or to the runtime. It is probably the most interesting software problem in inference hardware right now.

## 12. Caveats {#caveats}

- **These are judgements, not measurements.** The rubric makes them consistent and the reasons make them checkable, but a different team would land half a point away on many cells. Hover any point to see why it scored what it did.
- **The two scoring passes are correlated.** They worked independently but from the same research notes, which partly explains the close agreement.
- **Public information is uneven.** Edge NPUs, Etched, d-Matrix Raptor and Google's Tensor G5 rest on thin disclosure and are marked low confidence. Announced 2026 parts (TPU 8t/8i, Groq 3 LP30, SN50, Raptor) are scored from launch material, which tends to emphasize strengths.
- **The score measures design emphasis, not quality or performance.** A low score is not a criticism. Groq's CPU 0 is a deliberate choice, and so is Taalas's Network 0.5.
- **Heterogeneous scores describe the deployed system,** weighted by which component does most of the work. They are the least standard part of the method, and the Cerebras + MI455X system is a roadmap item, not a product.
- **Status as of November 2026.** AMD's Taalas acquisition was announced in August and is subject to closing conditions. NVIDIA's arrangement with Groq is a technology license plus hiring, and GroqCloud continues to run Groq's own chips.

Every number, reason and source is in the radar's *Table* tab and in the [data file](/assets/chip-radar/data.js). Corrections are welcome.

## 13. Sources {#sources}

The lens:
- [NeuralTalk on WeChat: reading chip design through the architect's background](https://mp.weixin.qq.com/s/TFExyhdJsxa7inerxCe8IQ)

Google TPU:
- [Jouppi et al., ten lessons from three generations of TPUs (ISCA 2021)](https://www.Gwern.net/doc/ai/scaling/hardware/2021-jouppi.pdf)
- [Jouppi et al., In-datacenter performance analysis of a TPU (ISCA 2017)](https://arxiv.org/abs/1704.04760)
- [TPU v4: an optically reconfigurable supercomputer (ISCA 2023)](https://arxiv.org/abs/2304.01433)
- Google Cloud docs: [v5e](https://docs.cloud.google.com/tpu/docs/v5e), [v5p](https://docs.cloud.google.com/tpu/docs/v5p), [v6e](https://docs.cloud.google.com/tpu/docs/v6e), [TPU7x](https://docs.cloud.google.com/tpu/docs/tpu7x)
- [Ironwood at Hot Chips 2025 (ServeTheHome)](https://www.servethehome.com/googles-ironwood-tpu-swings-for-reasoning-model-leadership-at-hot-chips-2025/)
- [Eighth-generation TPU announcement (Google)](https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/eighth-generation-tpu-agentic-era/)
- [TPU 8t and 8i at Hot Chips 2026 (ServeTheHome)](https://www.servethehome.com/googles-tpuv8s-for-training-and-inference-at-hot-chips-2026/)

Groq and NVIDIA:
- [Groq ISCA 2022 paper: a software-defined tensor streaming multiprocessor](https://groq.com/wp-content/uploads/2024/02/GroqISCAPaper2022_ASoftwareDefinedTensorStreamingMultiprocessorForLargeScaleMachineLearning.pdf)
- [Inside NVIDIA Groq 3 LPX (NVIDIA)](https://developer.nvidia.com/blog/inside-nvidia-groq-3-lpx-the-low-latency-inference-accelerator-for-the-nvidia-vera-rubin-platform)
- [NVIDIA Vera Rubin platform in depth (Tom's Hardware)](https://tomshardware.com/pc-components/gpus/nvidias-vera-rubin-platform-in-depth-inside-nvidias-most-complex-ai-and-hpc-platform-to-date)
- [tcgen05 programming guide (NVIDIA CUTLASS docs)](https://docs.nvidia.com/cutlass/4.7.0/media/docs/pythonDSL/guides/mma/tcgen05_programming.html)

Spatial and specialized:
- [Cerebras third-generation wafer (The Next Platform)](https://www.nextplatform.com/2024/03/14/cerebras-goes-hyperscale-with-third-gen-waferscale-supercomputers/), [Cerebras at Hot Chips 2026 (ServeTheHome)](https://www.servethehome.com/cerebras-talks-going-rack-scale-with-their-wses-at-hot-chips-2026/), [Cerebras on disaggregated inference](https://www.cerebras.ai/blog/disaggregated-inference)
- [SambaNova at Hot Chips 2026](https://sambanova.ai/blog/hot-chips-2026-dataflow-at-scale), [SN50 announcement](https://sambanova.ai/blog/introducing-the-sn50-rdu-purpose-built-for-agentic-inference)
- [Tenstorrent Blackhole (The Register)](https://www.theregister.com/2024/08/27/tenstorrent_ai_blackhole/)
- [AMD to acquire Taalas (AMD press release)](https://ir.amd.com/news-events/press-releases/detail/1296), [analysis by Jon Peddie Research](https://www.jonpeddie.com/news/amd-buys-taalas-and-a-very-different-idea-about-ai-inference/)
- [Etched Sohu claims (Tom's Hardware)](https://www.tomshardware.com/tech-industry/artificial-intelligence/sohu-ai-chip-claimed-to-run-models-20x-faster-and-cheaper-than-nvidia-h100-gpus)
- [d-Matrix Corsair at Hot Chips 2025](https://www.servethehome.com/d-matrix-presents-corsair-an-in-memory-computing-architecture-for-inference-at-hot-chips-2025/), [Raptor at Hot Chips 2026](https://servethehome.com/d-matrix-raptor-3d-dram-accelerator-for-generative-inference-at-hot-chips-2026), [d-Matrix and Gimlet](https://d-matrix.ai/announcements/gimlet/)

Hyperscalers:
- [MTIA (ISCA 2025)](https://aisystemcodesign.github.io/papers/MTIA-ISCA25.pdf), [MTIA roadmap (StorageReview)](https://www.storagereview.com/news/metas-mtia-roadmap-four-chip-generations-in-two-years-put-genai-inference-first)
- [Trainium and Inferentia2 architecture (AWS Neuron docs)](https://awsdocs-neuron.readthedocs-hosted.com/en/v2.32.0/_sources/nki/guides/architecture/trainium_inferentia2_arch.rst), [Trainium3 launch (Tom's Hardware)](https://www.tomshardware.com/tech-industry/artificial-intelligence/amazon-launches-trainium3-ai-accelerator-competing-directly-against-blackwell-ultra-in-fp8-performance-new-trn3-gen2-ultraserver-takes-vertical-scaling-notes-from-nvidias-playbook)
- [Maia 200 architecture deep dive (Microsoft)](https://techcommunity.microsoft.com/blog/azureinfrastructureblog/deep-dive-into-the-maia-200-architecture/4489312)

Merchant GPUs:
- [AMD MI300 architecture (ROCm docs)](https://rocm.docs.amd.com/en/latest/reference/gpu-arch/mi300.html), [MI455X and Helios (StorageReview)](https://www.storagereview.com/news/amd-mi455x-and-helios-432gb-hbm4-72-gpu-racks-and-a-real-answer-to-vera-rubin)
- [Huawei rack-scale systems (The Register)](https://www.theregister.com/2025/07/29/huawei_rackscale_boogeyman/), [Ascend roadmap (Tom's Hardware)](https://www.tomshardware.com/tech-industry/artificial-intelligence/huawei-ascend-npu-roadmap-examined-company-targets-4-zettaflops-fp4-performance-by-2028-amid-manufacturing-constraints)

Edge and PC:
- [Apple: deploying transformers on the Neural Engine](https://machinelearning.apple.com/research/neural-engine-transformers)
- [Qualcomm Hexagon (Chips and Cheese)](https://chipsandcheese.com/p/qualcomms-hexagon-dsp-and-now-npu)
- [AMD XDNA 2 in Ryzen AI 300 (AnandTech)](https://at-web1.www.anandtech.com/show/21469/amd-details-ryzen-ai-300-series-for-mobile-strix-point-with-rdna-35-igpu-xdna-2-npu/2)
- [Intel Panther Lake NPU (HotHardware)](https://hothardware.com/reviews/what-we-learned-at-intel-tech-tour-2025-panther-lake-and-18a?page=2)
- [Hailo-10H product page](https://hailo.ai/products/ai-accelerators/hailo-10h-ai-accelerator/)
- [Pixel 10 Tensor G5 (9to5Google)](https://9to5google.com/2025/08/20/pixel-10-tensor-g5/)

The full per-score source list (78 links) is in the data file.
