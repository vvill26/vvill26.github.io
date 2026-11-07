---
layout: post
title: "推理芯片的形状：40 颗芯片，10 个维度，一张雷达图"
date: 2026-11-07 09:00:00 +0800
permalink: /zh/2026/11/inference-chip-shapes/
lang: zh
description: "每颗推理芯片背后，都是一群有特定背景的人下的注。用 10 个设计维度给 40 颗芯片和 5 套 GPU 加专用加速器的混合系统打分，看看各家押的是什么，形状为什么差这么多。"
---

{% include lang-switch.html en="/2026/11/inference-chip-shapes/" zh="/zh/2026/11/inference-chip-shapes/" %}

<link rel="stylesheet" href="/assets/chip-radar/radar.css">

*这篇比较长，可以用目录跳着看。重点是中间的[交互雷达图](#radar)，单独玩也行。图里的标签是英文。*

<nav class="toc" markdown="1">
**目录**

1. [芯片长什么样，取决于谁设计的](#idea)
2. [十个维度，怎么打分](#axes)
3. [交互雷达图](#radar)
4. [Google TPU：十一代，一个不变量](#tpu)
5. [挑战者：绕开 GPU 的四条路](#challengers)
6. [云厂商自研：从电费账单出发](#hyperscalers)
7. [通用 GPU：一直在长大的多面手](#gpus)
8. [异构系统：一种形状不够用了](#hetero)
9. [云、边缘、PC：同样的坐标，不同的重心](#deploy)
10. [七个流派，各自怕什么](#families)
11. [对编译器和运行时意味着什么](#software)
12. [局限](#caveats)
13. [参考来源](#sources)
</nav>

## 1. 芯片长什么样，取决于谁设计的 {#idea}

前阵子 NeuralTalk 有篇[文章](https://mp.weixin.qq.com/s/TFExyhdJsxa7inerxCe8IQ)讲了一个很朴素的观察：看一颗 AI 芯片，往往能猜出团队是什么出身。做 GPU 出身的，会做线程和大寄存器堆。做编译器出身的，会把硬件仲裁拿掉，让编译器看清每一个周期。做后端物理设计的，盯着连线下手。做数据中心的，从电费开始算。

这个视角好用，因为它解释的是芯片**为什么**不一样，而不只是哪里不一样。规格表告诉你算力和带宽，但不会告诉你设计者认为最难的问题是哪一个。

这篇文章把这个视角量化了。原文有九个出身维度，我加了第十个（CGRA / FPGA 空间数据流，这一派明显自成体系），然后给 2015 到 2026 年间 40 颗和推理相关的芯片逐项打分。另外还打了 5 套**异构系统**，也就是一个请求由 GPU 和另一种加速器分工完成。2026 年行业正是往这个方向走的。

先说一句：**雷达图面积大，不代表芯片好。** 每个维度衡量的是某种出身的直觉在多大程度上决定了这颗芯片的关键设计。十项全满分的芯片，大概是开会开出来的。真正有意思的是形状。

## 2. 十个维度，怎么打分 {#axes}

每个维度 0 到 5 分，问的都是同一个问题：**这种出身的思路，在多大程度上决定了芯片的关键设计？**

| 维度 | 0 分 | 5 分 |
|---|---|---|
| **VLSI / 物理实现** | 常规大 die，没有物理层面的押注 | 物理实现本身就是架构（晶圆级、冗余内建） |
| **CPU** | 没有通用控制核，没有 cache | 一颗 CPU 挂了个矩阵单元 |
| **GPU** | 没有 SIMT，不能通用编程 | 完整 SIMT、warp，CUDA 级可编程性 |
| **运行时 / 服务** | 一切由 host 驱动 | 芯片按服务系统来设计（KV 分页、请求调度、prefill/decode） |
| **编译器** | 依赖全靠硬件动态发现 | 完全由编译器编排：没有互锁，编译器知道每个周期 |
| **CGRA / 数据流** | 时分复用的核 | 芯片本身是空间计算阵列，整张图铺在空间上 |
| **算法** | 通用数据通路 | 模型本身做进了硅片 |
| **网络 / 分布式** | 单卡思维 | 整个 pod 才是一台机器 |
| **存储 / 封装 / PHY** | 存储按惯例配 | 围绕每 token 搬多少字节来设计（全 SRAM、存内计算） |
| **数据中心 / TCO** | 峰值算力优先 | 从所有者自己的机群经济账倒推出来 |

完整的评分标准在 1 分和 3 分也有锚点，保证每个维度上的「3 分」是同一个意思。

**方法。** 资料只用公开来源：厂商论文和博客、Hot Chips 2025 和 2026 的报道、ISCA 论文、云厂商文档、靠谱的技术媒体。然后用同一套标准做了两轮独立打分，一轮按芯片逐颗打，一轮按维度打（同一维度先把所有芯片排一遍）。每个分数都附一句理由、一个出处和一个置信度（论文或规格为高，厂商说法或二手分析为中，推断为低）。最终分数取两轮平均，置信度取两轮中较低的那个。

两轮结果很接近：450 个分数里有 317 个完全一样，相差整 1 分的只有 3 个。部分原因是两轮用的是同一批研究笔记，所以这更像是一致性，不算证明。[局限](#caveats)一节会细说。

## 3. 交互雷达图 {#radar}

最多选三颗芯片叠在一起比；看所有芯片的「指纹」；播放 TPU 的十年演进；拆开看异构系统；按部署场景对比。鼠标悬停在任何一个点上，能看到分数、置信度和打分理由。

<div id="chip-radar"></div>
<script src="/assets/chip-radar/data.js"></script>
<script src="/assets/chip-radar/radar.js"></script>

*默认显示 TPU v7 Ironwood、NVIDIA Groq 3 LP30 和 NVIDIA Rubin：同一个问题，三种很不一样的押法。*

## 4. Google TPU：十一代，一个不变量 {#tpu}

TPU 是我们能找到的最好的自然实验：同一家公司，同一套软件栈，十年十一颗芯片。在雷达图里点 TPU timeline 播放，看看哪些在动。

**不变的是编译器。** 从 2015 年的 int8 协处理器到 2026 年的 TPU 8i，每一代编译器维度都是 4.5 分。大块脉动阵列、VLIW 指令包、软件管理的存储，全部由 XLA 编译器来排。没给满分，只是因为 HBM 搬运是异步的，软件要靠同步标志位等待。十年、十几个工艺节点过去了，Google 从来没有把调度权交还给硬件。

**变的是网络。** TPU v1 是一张 PCIe 卡（网络 0 分）。v2 变成训练节点，有了 torus 互联（3 分）。v4 加上光路交换，整个 pod 成了一台机器（5 分）。之后的旗舰款一直是 5 分，一直到 Ironwood 的 9,216 芯片 pod，和第八代里专为百万芯片级训练做的 TPU 8t。

**不太被注意的第二条线：成本。** TPU v4i、v5e、v6e 不是旗舰的缩水版，而是 TCO 优先的设计：风冷、pod 更小、HBM 更少，按每美元、每瓦来算。它们的 TCO 是 4.5 到 5 分，网络只有 1 到 3 分。Google 早就在跑两条路线了，只是没明说。

**2026 年，分岔摆到了台面上。** 第八代是两颗芯片。TPU 8t 专做训练。TPU 8i 是 Google 第一颗延迟优先的推理 TPU：片上 SRAM 大很多，网络直径更小，集合通信放进了网络里。它的存储维度升到 4 分，运行时升到 3.5 分，是所有 TPU 里最高的。从「编译器加机群经济账」起家的形状，上面又长出了一台服务机器。

## 5. 挑战者：绕开 GPU 的四条路 {#challengers}

创业公司的形状最极端，因为每家都把注押在一个想法上。

**确定性、全 SRAM：Groq。** Groq 的芯片（Groq 自己叫 tensor streaming processor）是这次研究里最纯粹的编译器机器：编译器 5 分，存储 5 分，CPU 0 分。没有 cache，没有仲裁器，没有互锁，连芯片之间的网络都在静态调度里。权重放在片上 SRAM，分散在很多颗芯片上。这种纯粹的代价体现在运行时上（第一代不到 1 分）：硬件不做任何动态的事，所有动态的事都归 host 管。2026 年 NVIDIA 授权了这项技术，把它改造成 [Groq 3 LP30](https://developer.nvidia.com/blog/inside-nvidia-groq-3-lpx-the-low-latency-inference-accelerator-for-the-nvidia-vera-rubin-platform)，放进 Vera Rubin 机柜里做 decode 协处理器。芯片本身的形状几乎没变，变的是它的角色（见[第 8 节](#hetero)）。

**晶圆级：Cerebras。** Cerebras 把物理设计这一派推到了极限：VLSI 5 分，存储 5 分。思路是把一切都放在一整片富含 SRAM 的晶圆上，干脆不要网络，所以 WSE-2 的网络只有 2 到 2.5 分。到了 WSE-3，加上 [Hot Chips 2026](https://www.servethehome.com/cerebras-talks-going-rack-scale-with-their-wses-at-hot-chips-2026/) 上展示的机柜级系统，网络升到 3 分，晶圆也越来越多地被当成 decode 引擎，和别家的 prefill 配对使用。

**空间数据流：SambaNova。** SambaNova 是 CGRA 流派的代表：CGRA 5 分。它的可重构数据流单元把整段计算图铺在空间上，激活值在单元之间流动，背后是三级存储（SRAM、HBM、大容量 DDR）。这套组合适合同时服务很多个模型。[SN50](https://sambanova.ai/blog/introducing-the-sn50-rdu-purpose-built-for-agentic-inference) 保留了这个形状，但换了定位：风冷，内置以太网 scale-up，主打 decode。

**每 token 搬多少字节：Taalas、Etched、d-Matrix。** 这三家都是从内存墙出发，而不是从计算单元出发。
- [Taalas HC1](https://www.jonpeddie.com/news/amd-buys-taalas-and-a-very-different-idea-about-ai-inference/) 最极端：模型权重直接做进了芯片的连线里。它是全文唯一一个算法 5 分，存储 5 分，网络 0.5 分。AMD 在 2026 年 8 月[宣布收购 Taalas](https://ir.amd.com/news-events/press-releases/detail/1296)，说这项技术是对 Instinct GPU 的补充。
- Etched Sohu 只跑 transformer（算法 4.5 分）。它是这里公开技术细节最少的一颗，形状的置信度偏低。
- d-Matrix [Corsair](https://www.servethehome.com/d-matrix-presents-corsair-an-in-memory-computing-architecture-for-inference-at-hot-chips-2025/) 在 SRAM 里做计算（存储 5 分）。已经发布的 [Raptor](https://servethehome.com/d-matrix-raptor-3d-dram-accelerator-for-generative-inference-at-hot-chips-2026) 把定制 DRAM 堆在逻辑上，计划放进 NVIDIA 的机柜里。

**另类：Tenstorrent。** [Blackhole](https://www.theregister.com/2024/08/27/tenstorrent_ai_blackhole/) 的 CPU 分在数据中心芯片里最高（3.5 分）：750 多个小 RISC-V 核驱动计算单元，另有 16 个能跑 Linux 的核，每颗芯片都带以太网，软件栈开源。这是 CPU 架构师的答案：把加速器做成一台众核计算机，剩下的交给软件。

## 6. 云厂商自研：从电费账单出发 {#hyperscalers}

Meta、AWS、微软自己有负载，自己付电费，形状上一眼就看得出来。数据中心 / TCO 是它们最高的维度：Maia 200 和 MTIA 2i 都是 5 分，Trainium3 是 4.5 分。

细节上各家不一样：
- **Meta MTIA** 的 CPU 分出乎意料地高（3 分）。它的处理单元里有 RISC-V 核和 cache，因为它最早是给推荐排序模型做的，那类负载控制流很不规则。[MTIA 300/400 的路线图](https://www.storagereview.com/news/metas-mtia-roadmap-four-chip-generations-in-two-years-put-genai-inference-first)转向了 chiplet、HBM 和 72 芯片机柜，面向生成式 AI。
- **AWS Inferentia2 和 Trainium3** 像是 TPU 的表亲：编译器 4 分，多个独立引擎由编译器同步，存储由软件管理。扩展靠交换式的 UltraServer，整体围绕 EC2 定价来设计。
- **微软 Maia 200** 是最典型的「推理经济学」芯片：软件管理的 SRAM、FP4、片上集成以太网 scale-up。微软那篇[架构详解](https://techcommunity.microsoft.com/blog/azureinfrastructureblog/deep-dive-into-the-maia-200-architecture/4489312)读起来像一个 TCO 模型，顺带附了一颗芯片。

## 7. 通用 GPU：一直在长大的多面手 {#gpus}

GPU 的形状和 Groq 正好相反：GPU 5 分，编译器 1.5 分，CGRA 0.5 到 1.25 分。硬件靠线程和占用率来隐藏延迟，编译器就不用知道每个周期。这正是 GPU 什么都能跑的原因。

更有意思的是 GPU 的形状一直在**长大**：

| | 运行时 | 网络 | 存储 | 数据中心 / TCO |
|---|---|---|---|---|
| H100（2022） | 3.5 | 3 | 1.75 | 1.75 |
| B200（2024） | 3.5 | 4 | 2.25 | 3.25 |
| Rubin（2026） | 4.5 | 4.5 | 3.25 | 4 |

Rubin 已经不太像一颗芯片，更像一个机柜级的推理服务平台：六颗协同设计的芯片、HBM4、分层的 KV cache 存储、NVIDIA 的 Dynamo 推理服务软件。同时它的 GPU 分略降（从 5 到 4.5），因为 Blackwell 和 Rubin 把矩阵计算挪进了异步的 tile 引擎，多少游离在经典 SIMT 模型之外。多面手正在一个维度一个维度地把其他流派吃进来。

AMD 走的是同一条路，起点不同。MI300X 主打 chiplet 和每美元的显存容量（VLSI 3.75 分）。[MI455X 和 Helios](https://www.storagereview.com/news/amd-mi455x-and-helios-432gb-hbm4-72-gpu-racks-and-a-real-answer-to-vera-rubin) 加上了单卡最大的 HBM 和基于以太网的 scale-up。

华为昇腾的形状是被供应限制塑造出来的。910C 的 TCO 只有 1 分，网络却有 4.75 分：单颗芯片弱一些，就用超大规模的光互联超节点来补。昇腾 950 保留了这个网络，又加了一条 SIMT 风格的编程路径（GPU 3 分）。

## 8. 异构系统：一种形状不够用了 {#hetero}

2026 年最大的变化不是某种新的芯片形状，而是在一条请求链路上同时用两种形状。打开雷达图的 Heterogeneous 标签页：实心的是各个组件，虚线是部署后的整个系统。

| 系统 | 组件一 | 组件二 | 怎么分工 |
|---|---|---|---|
| NVIDIA Vera Rubin NVL72 + Groq 3 LPX | Rubin GPU | Groq 3 LPU | GPU 管 attention 和 KV cache，LPU 跑 decode 里的 FFN/MoE 层，每个 token 交接一次 |
| AWS Trainium + Cerebras CS-3 | Trainium | Cerebras 晶圆 | Trainium 做 prefill，晶圆做 decode，KV cache 走 EFA 传过去 |
| SambaNova SN50 + GPU | H200 级 GPU | SN50 | GPU 只做 prefill，数据流芯片做 decode |
| d-Matrix Corsair + GPU（经 Gimlet） | GPU | Corsair 卡 | 软件把请求的一部分（比如草稿解码）派给存内计算卡 |
| Cerebras 晶圆 + AMD MI455X（计划中） | MI455X | Cerebras 晶圆 | 晶圆做 decode，旁边是 HBM 充足的 GPU；已宣布，未出货 |

分数里有三点很明显。

**合起来的形状很大，这正是目的。** Vera Rubin 加 LPX 在运行时、网络、存储三个维度上同时拿到 5 分。HBM 存 KV cache，SRAM 流式供给权重。这次研究里没有任何一颗单芯片能两头兼顾。

**编译器分降下来了。** 系统的编译器分（3.25）落在 LPU 的 5 分和 GPU 的 2 分之间，因为一半是静态调度，一半是动态调度。两者的边界得有人来管。

**运行时成了最难的维度。** 已出货或已宣布的异构系统，运行时都在 4 分以上（计划中的 Cerebras + MI455X 是 3.5 分，只是因为它的服务软件还没公开）。难点已经不在任何一颗芯片内部了，而在于决定哪个阶段、哪一层、哪个 token 去哪里，并且足够快地把 KV cache 或激活值搬过去。NVIDIA 对 [LPX 的介绍](https://developer.nvidia.com/blog/inside-nvidia-groq-3-lpx-the-low-latency-inference-accelerator-for-the-nvidia-vera-rubin-platform)是在每个 token 内部拆 attention 和 FFN，[Cerebras 讲解耦推理的文章](https://www.cerebras.ai/blog/disaggregated-inference)是拆 prefill 和 decode。这是同一个思路的两个层级。

这也改变了怎么看那些挑战者。一颗单独看太窄的芯片，比如全 SRAM 的 decode 芯片、或者不要网络的晶圆，一旦有 GPU 帮它兜住所有它不擅长的事，就变得非常有用。AMD 收购 Taalas 给出的理由，「补充 GPU」，也是同一个逻辑。

## 9. 云、边缘、PC：同样的坐标，不同的重心 {#deploy}

雷达图里的 Cloud vs edge 标签页，把各场景的形状取了平均。

| 场景 | 芯片数 | 最高的维度 | 最低的维度 |
|---|---|---|---|
| 云端，推理优先 | 14 | 编译器 3.9、存储 3.9、TCO 3.9 | GPU 0.8、CPU 0.9 |
| 云端，训练加推理 | 20 | 网络 3.7、编译器 3.4、TCO 3.4 | CPU 1.5、CGRA 1.9 |
| 边缘、PC、手机 | 6 | TCO 4.2、编译器 3.7 | 网络 0、GPU 0.8 |

边缘场景没有机群，这里的 TCO 指每 token 的能耗和成本。

三点观察：
- **除了能训练的云端芯片，GPU 维度几乎是空的。** 只做推理的芯片，不管在云端还是边缘，平均都不到 1 分。如果只为推理设计，SIMT 的通用性是第一个被舍弃的。
- **存储维度把云端推理芯片区分开了。** 云端推理芯片的存储平均 3.9 分，训练芯片 2.7，边缘 2.1。在数据中心，decode 卡在每 token 搬多少字节上，推理专用芯片就是围绕这一点设计的。
- **到了边缘，网络消失了，编译器还在。** 笔记本和手机上的 NPU（苹果神经网络引擎、高通 Hexagon、AMD XDNA 2、Intel NPU 5、Hailo-10H、Google Tensor G5）都没有横向扩展，形状缩成了编译器、能耗和片上存储。XDNA 2 是完整的 CGRA（4.5 分），来自 Xilinx。Hexagon 是一颗带真正 CPU 机制的 VLIW DSP（CPU 3.5 分）。苹果的神经网络引擎是封闭的，只能通过 Core ML 用。边缘厂商披露得最少，这些形状的置信度也最低。

## 10. 七个流派，各自怕什么 {#families}

雷达图的 All chips 标签页把所有芯片分成七个流派。每个形状都可以当成设计者对「最难的是什么」这个问题的回答。

1. **编译器优先、从机群出发**（TPU、Inferentia/Trainium、Maia）。**怕的是账单。** 编译器平均 4.4，TCO 4.3。负载是自己的，所以静态调度和软件管理存储值得编译器去下功夫。
2. **确定性、全 SRAM**（Groq）。**怕的是不可预测。** 编译器 5，存储 5，CPU 0。把一切动态的东西都拿掉，然后接受 host 要处理所有这些事。
3. **空间数据流和晶圆级**（Cerebras、SambaNova）。**怕的是数据出芯片。** CGRA 4.6，存储 4.7，VLSI 4.0。让激活值一直留在阵列上。
4. **押注每 token 字节数**（Taalas、Etched、d-Matrix）。**怕的是内存墙。** 存储 4.4，算法 3.6。放弃通用性，换每 token 少搬一些字节。
5. **偏 CPU 的众核**（Tenstorrent、MTIA）。**怕的是没预料到的负载。** CPU 3.2。留足够的通用控制能力，不管下一个负载是什么都能跑。
6. **通用 GPU**（NVIDIA、AMD、华为）。**怕的是失去开发者。** GPU 4.0，网络 4.0，运行时 3.4。先守住可编程性，然后每一代加互联、加存储、加推理服务软件。
7. **端侧 NPU**。**怕的是电池。** 网络 0，TCO 4.2。每 token 的能耗决定一切。

这些「怕」没有哪个是错的。它们是对「什么会稀缺」的不同回答：算力、内存带宽、功耗、开发者的时间，还是灵活性。异构系统之所以出现，是因为老实的答案是「都稀缺，只是在同一个请求的不同阶段」。

## 11. 对编译器和运行时意味着什么 {#software}

对做软件栈（编译器、vLLM、SGLang）的人来说，有三个结论。

**第一，「编译器」在不同形状上是不同的活。** 在 Groq 这样的芯片上，编译器就是调度器，精确到周期，跨芯片。在 TPU 或 Trainium 上，它要显式管理存储和同步。在 GPU 上，它主要负责生成好的 kernel，调度交给硬件。在 CGRA 上，它要做布局和布线。一套编译器架构要同时服务这四种，前提是它清楚自己在做的是哪一种活。

**第二，运行时是涨得最快的维度。** 它在一代代 GPU 上涨，在 TPU 8i 上涨，在每一个异构系统上都高。推理服务引擎过去是硬件之上的一层，现在正在变成硬件设计的一部分：KV cache 分层、prefill 和 decode 的放置、不同芯片之间按 token 交接。vLLM 和 SGLang 已经把 prefill-decode 解耦当成一等功能了。下一步是一个能理解不同芯片类型的调度器，而不只是不同节点。

**第三，静态和动态的边界，现在是一个系统设计问题。** 当一颗确定性芯片和一颗动态芯片共同处理一个 token 时，总得有人在精确到周期的调度和 batch 大小、到达时间都在变的世界之间做翻译。这一层既不完全属于编译器，也不完全属于运行时。它大概是眼下推理硬件里最有意思的软件问题。

## 12. 局限 {#caveats}

- **这些是判断，不是测量。** 评分标准保证了一致性，理由让每个分数可以核对，但换一个团队来打，很多格子会差半分。悬停在任何一个点上，可以看到打分理由。
- **两轮打分是相关的。** 两轮是各自独立打的，但用的是同一批研究笔记，这在一定程度上解释了为什么结果这么接近。
- **公开信息不均匀。** 端侧 NPU、Etched、d-Matrix Raptor、Google Tensor G5 依据的披露很少，标为低置信度。2026 年刚发布的芯片（TPU 8t/8i、Groq 3 LP30、SN50、Raptor）根据发布材料打分，而发布材料通常偏重优点。
- **分数衡量的是设计侧重，不是好坏或性能。** 低分不是批评。Groq 的 CPU 0 分是有意为之，Taalas 的网络 0.5 分也是。
- **异构系统的分数描述的是部署后的系统**，按哪个组件承担了主要工作来加权。这是方法里最不标准的部分，Cerebras + MI455X 还只是路线图，不是产品。
- **状态截至 2026 年 11 月。** AMD 收购 Taalas 在 8 月宣布，尚待完成交割条件。NVIDIA 和 Groq 之间是技术授权加人员招聘，GroqCloud 仍在用 Groq 自己的芯片。

所有分数、理由和出处都在雷达图的 Table 标签页和[数据文件](/assets/chip-radar/data.js)里。欢迎指正。

## 13. 参考来源 {#sources}

完整来源列表见[英文版](/2026/11/inference-chip-shapes/#sources)，每个分数对应的 78 个链接都在数据文件里。主要来源：

- [NeuralTalk：从架构师的出身看芯片设计](https://mp.weixin.qq.com/s/TFExyhdJsxa7inerxCe8IQ)
- [Jouppi 等，三代 TPU 的十条经验（ISCA 2021）](https://www.Gwern.net/doc/ai/scaling/hardware/2021-jouppi.pdf)
- [TPU v4：光路可重构的超级计算机（ISCA 2023）](https://arxiv.org/abs/2304.01433)
- [第八代 TPU 在 Hot Chips 2026（ServeTheHome）](https://www.servethehome.com/googles-tpuv8s-for-training-and-inference-at-hot-chips-2026/)
- [Groq ISCA 2022 论文](https://groq.com/wp-content/uploads/2024/02/GroqISCAPaper2022_ASoftwareDefinedTensorStreamingMultiprocessorForLargeScaleMachineLearning.pdf)
- [NVIDIA Groq 3 LPX 详解（NVIDIA）](https://developer.nvidia.com/blog/inside-nvidia-groq-3-lpx-the-low-latency-inference-accelerator-for-the-nvidia-vera-rubin-platform)
- [Cerebras 解耦推理](https://www.cerebras.ai/blog/disaggregated-inference)
- [SambaNova 在 Hot Chips 2026](https://sambanova.ai/blog/hot-chips-2026-dataflow-at-scale)
- [AMD 收购 Taalas（AMD 新闻稿）](https://ir.amd.com/news-events/press-releases/detail/1296)
- [d-Matrix 与 Gimlet](https://d-matrix.ai/announcements/gimlet/)
- [MTIA（ISCA 2025）](https://aisystemcodesign.github.io/papers/MTIA-ISCA25.pdf)
- [Maia 200 架构详解（微软）](https://techcommunity.microsoft.com/blog/azureinfrastructureblog/deep-dive-into-the-maia-200-architecture/4489312)
- [AMD MI455X 与 Helios（StorageReview）](https://www.storagereview.com/news/amd-mi455x-and-helios-432gb-hbm4-72-gpu-racks-and-a-real-answer-to-vera-rubin)
- [高通 Hexagon（Chips and Cheese）](https://chipsandcheese.com/p/qualcomms-hexagon-dsp-and-now-npu)
