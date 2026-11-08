---
layout: post
title: "魔镜，轮到我了：设计一颗推理芯片"
date: 2026-11-15 09:00:00 +0800
permalink: /zh/2026/11/design-an-inference-chip/
lang: zh
description: "一个小游戏：选一个设计场景，做六个设计决定，看代价由谁来付、你的设计最像哪颗真实芯片。再附六张设计卡和一个盲测。"
---

{% include lang-switch.html en="/2026/11/design-an-inference-chip/" zh="/zh/2026/11/design-an-inference-chip/" %}

<script>window.CHIPS_LANG="zh";</script>
<link rel="stylesheet" href="/assets/chip-radar/game.css">

周一早上，切回正向模式。[上一篇](/zh/2026/11/inference-chip-shapes/)我把 43 颗推理芯片倒着读了一遍：拿出货的设计，猜团队当初认为什么最稀缺。这一篇换你来设计。从六个设计场景里选一个，做六个决定，看看哪个真实团队已经押过同样的注。

**玩法。** 先选一个设计场景，再在六行里每行选一个选项。右侧面板随点随变：你的芯片在上一篇十个维度上的形状；虚线是 43 颗真实芯片里离你最近的那颗；代价落在谁身上（硬件、编译器还是推理服务），和这个场景的预算比一比；以及能不能通过这个场景的三项检查。这只是个玩具模型，重点是取舍，不是分数。

<div id="chip-game"></div>

第一次玩，通常会遇到三件事。

1. **超预算。** 每一行都挑最强的选项，账单就同时落到所有人头上。这就是上一篇说的「开会开出来的芯片」：十项全满分，没人愿意买单。
2. **代价只会转移，不会消失。** 全静态调度让硬件便宜、编译器变贵；做 PD 分离（预填充和解码放在不同芯片上），每颗芯片都简单了，服务层却更难了。总账很少明显变小，变的是谁来付。
3. **不同的场景奖励相反的选择。** 把模型固化进硅片，能轻松通过「一个模型，冻结」，却过不了「多模型」；GPU 加 PD 分离能扛住「超长上下文」，却过不了「端侧」。六个场景，六个不同的赢家。这就是把反向研究正着走一遍：形状不同，是因为稀缺的东西不同。

## 六张设计卡

游戏里的每个机制，都是真实团队做过的决定。一张设计卡记录一个决定，分五栏：**约束**、**机制**、没有选的那条**替代方案**、**代价**由谁承担，以及**什么证据会推翻这个判断**。最后一栏最重要：雷达图的分数只能拿来争论，设计卡却可能被证明是错的。

六张卡都只用公开资料。凡是我自己推断、而不是设计者亲口说的理由，卡上都会注明。

<a id="card-v4"></a>
### 1. TPU v4：光交换机

- **约束。** Google 想把芯片数做到 TPU v3 的四倍，一套系统 4,096 颗。这么大的固定 torus 很难全员健康：论文给出的主机不可用时间是 0.1% 到 1%。
- **机制。** 用光路交换机连起 3D torus。论文把它比作配线板：跳过坏掉的单元，按任务重新切分。
- **没选的方案。** 固定的电互连 torus，或者 InfiniBand 这类分组交换网络。
- **代价。** 光器件和交换机占系统成本不到 5%、功耗不到 3%。每个任务都要重新配置切片，这份工作落在调度软件身上。
- **什么会推翻它。** 目前没有。论文说最初的动机是规模和可靠性，拓扑灵活带来的大模型训练加速是后来才发现的好处。到了 9,216 颗芯片的 Ironwood，光交换机还在。如果将来同样规模的机群把它拿掉，就说明可用性并不是那个卡脖子的约束。

出处：[Jouppi 等，ISCA 2023](https://arxiv.org/abs/2304.01433)；[Ironwood，Hot Chips 2025](https://www.servethehome.com/googles-ironwood-tpu-swings-for-reasoning-model-leadership-at-hot-chips-2025/)

<a id="card-v4i"></a>
### 2. TPU v4i：把风冷写进设计规则

- **约束。** 一颗能部署到 Google 每个数据中心的推理芯片，按总拥有成本衡量性能，而不是按采购价。
- **机制。** 单个 TensorCore，芯片面积不到 400 mm²，175 W，风冷。128 MB 片上 CMEM 让权重留在近处。支持多租户，模型切换不到 100 微秒。
- **没选的方案。** 直接拿训练芯片来做推理。
- **代价。** 单芯片峰值算力更低，只有两条 ICI 链路，大模型放不进一颗芯片。多出来的片上存储要靠编译器管理。
- **什么会推翻它。** 这张卡本身就有矛盾：五年后 Google 的推理 TPU Ironwood 用的是液冷。要么风冷规则针对的是 2020 年的机群，而不是推理本身；要么模型变大以后约束变了。第二种解释更贴合数据，但终究是解释。

出处：[Jouppi 等，ISCA 2021](https://conferences.computer.org/iscapub/pdfs/ISCA2021-4ghucdBnCWYB7ES2Pe4YdT/333300a001/333300a001.pdf)

<a id="card-sn40l"></a>
### 3. SambaNova SN40L：第三层存储

- **约束。** 「专家组合」（Composition of Experts）：很多个小模型，上一个的输出决定下一个用谁。在常规硬件上，换模型就得重新加载权重，而把所有模型都常驻又太贵。
- **机制。** 芯片直接挂三层存储：520 MiB 片上 SRAM、64 GiB HBM、最多 1.5 TiB DDR。每个节点从 DDR 往 HBM 搬模型的速度超过 1 TB/s。
- **没选的方案。** 把所有专家都放进多块 GPU 的 HBM。
- **代价。** 本来就很大的芯片上还要放 DDR 控制器和引脚，软件还得决定哪个模型放哪一层。论文自己测得：和 DGX 相比，机器规模最多缩小 19 倍，模型切换快 15 到 31 倍。
- **什么会推翻它。** 如果多模型服务一直是小众需求，DDR 这一层就是白花的成本。目前只有一个数据点：SN50 保留了三层结构。

出处：[Prabhakar 等，2024](https://arxiv.org/abs/2405.07518)

<a id="card-sn50"></a>
### 4. SambaNova SN50：PD 分离

- **约束。** 智能体负载里，单用户的解码速度决定体验，而预填充计算量大、来得猛。
- **机制。** GPU 做预填充，SN50 做解码，每个请求在两者之间传一次 KV cache。SambaNova 2026 年 7 月的演示用 4 块 H200 做预填充、16 颗 SN50 做解码。
- **没选的方案。** 一种芯片包办两个阶段。
- **代价。** 每个请求都要过一次网络传 KV，两套软件栈，运维团队要同时管两种机器。买单的是服务层。
- **什么会推翻它。** 独立的长上下文实测。SambaNova 自己报告的结果在短上下文和长上下文之间就有差别，两边之间的链路也没有公开。SN50 目前是已发布状态，计划 2026 年下半年出货。

出处：[SambaNova SN50 发布](https://sambanova.ai/blog/introducing-the-sn50-rdu-purpose-built-for-agentic-inference)；[SambaNova 演示](https://sambanova.ai/blog/sn50-runs-fastest-minimax-speeds-in-the-world)

<a id="card-m5"></a>
### 5. Apple M5：两套 AI 引擎

- **约束。** 在笔记本和手机的功耗下做本地 AI：常驻的系统功能和突发的大模型任务，挤在同一颗芯片、同一块内存里。
- **机制。** 有两处可以跑 AI。16 核神经网络引擎（Neural Engine）继续走省电路线。M5 新加的是：10 个 GPU 核心每个都配了一个 Neural Accelerator。Apple 自己的 M5 大模型研究就跑在这里，用的是 MLX 和 Metal 4，没有用神经网络引擎。
- **没选的方案。** 把神经网络引擎做大，让它也能跑大模型。
- **代价。** 两条编程路径，Core ML 和 Metal / MLX，共用 153 GB/s 的统一内存。Apple 的数据也显示了上限：首 token 时间（TTFT）比 M4 快 3.3 到 4 倍，解码只快 1.2 到 1.3 倍，差不多就是内存带宽的提升幅度。买单的是框架层。
- **什么会推翻它。** Apple 没有解释为什么这样分工，上面的约束是我的推断。如果后续某一代把大模型挪到神经网络引擎上，这次分工就只是过渡，不是设计规则。

出处：[Apple Newsroom：M5](https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/)；[Apple 机器学习研究：M5 GPU 上的大模型](https://machinelearning.apple.com/research/exploring-llms-mlx-m5)

<a id="card-lpx"></a>
### 6. Rubin + LPX：交接

- **约束。** 长上下文、强交互的解码，在 GPU 上，每个用户能分到的 HBM 带宽限制了每秒 token 数。
- **机制。** Groq 3 LPX 机柜放在 Vera Rubin 机柜旁边，每颗 LP30 带 500 MB SRAM。英伟达给了三种分工：PD 分离，GPU 做预填充、LPX 做解码；AFD 分离（注意力 / FFN 分离），GPU 保留 KV cache 跑注意力，LPX 跑 FFN 或 MoE 专家；投机解码，LPX 用小模型起草、GPU 验证。
- **没选的方案。** 让 GPU 自己塞满 SRAM，代价是容量和通用性。
- **代价。** AFD 分离意味着每个全注意力层都要传一次中间激活，就在每个 token 的关键路径上。买单的是服务系统和网络。
- **什么会推翻它。** 端到端的实测结果。LPX 单独的速度是实测的，英伟达给出的 2 万亿参数模型联合结果还是预测值。

出处：[英伟达：Groq 3 LPX 详解](https://developer.nvidia.com/blog/inside-nvidia-groq-3-lpx-the-low-latency-inference-accelerator-for-the-nvidia-vera-rubin-platform)；[英伟达：LPX 的长上下文表现](https://developer.nvidia.com/blog/how-nvidia-groq-3-lpx-unlocks-ultrafast-interactivity-at-long-context-on-nvidia-vera-rubin/)

## 看形状，猜团队

上一篇说，一颗芯片能看出设计者的出身。这里做个小测试：四颗芯片，名字藏起来，你猜分别是什么出身的人做的？

<div id="chip-blind"></div>
<script src="/assets/chip-radar/data.js"></script>
<script src="/assets/chip-radar/game.js"></script>

四个选项、四颗芯片，瞎猜平均能对一个。如果读者明显猜得更准，说明形状里确实带着团队的信息；如果不是，那形状是负载决定的，出身只是事后讲的故事。欢迎留言报分数。

## 几点说明

- 游戏是个玩具。每个机制会抬高某几个维度，形状取所有选择里的最高值。维度高低、代价和预算都是我简化出来的，调到让几种典型设计落在各自的真实芯片附近，不是测量结果。
- 雷达图分数来自[上一篇](/zh/2026/11/inference-chip-shapes/)，出处和已知的弱点都在那里。
- 故意没有给任何组合打「最佳」。每张卡讲的是一个取舍，不是排名。

周末的研究给了我一张清单，这一篇把它做成了游戏。该回正向模式了。
