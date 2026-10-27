---
layout: post
title: "从「每 token 成本」到「每任务成本」：一个推理芯片软件人读 Anthropic S-1"
date: 2026-10-27 12:00:00 +0800
permalink: /zh/2026/10/anthropic-s1-inference-chips/
lang: zh
description: "Anthropic S-1 里对芯片人最重要的不是 163 亿美元收入，而是「每任务成本」；而招股书里最大的一笔硬件承诺，买的是推理芯片。"
---

{% include lang-switch.html en="/2026/10/anthropic-s1-inference-chips/" zh="/zh/2026/10/anthropic-s1-inference-chips/" %}

Anthropic 在 2026 年 10 月 26 日公开了 S-1 招股书。大多数报道在看收入、亏损和估值。我做推理芯片的软件栈（编译器、vLLM、SGLang），读下来最在意的是另一个信号：**Anthropic 已经用「每任务成本」衡量自己的产品，而芯片行业还在用 tokens/s 和 tokens/W 做 benchmark。**

我带着三个问题读了招股书正文和附件：agentic 推理的市场有多大、芯片和模型的协同设计还有多少空间、慢节奏的芯片怎样跟上快节奏的模型。

## 对芯片最重要的几个数字

| 来自 S-1 | |
|---|---|
| 2026 上半年收入 | $16.3B（去年同期 $1.2B） |
| Q2'26 收入 / 算力开支 | $11.6B / $5.6B = **每 $1 算力换 $2.08 收入** |
| Q2'26 同比增长 | 收入 +1,368%，算力 +300% |
| 年付费 ≥ $10 万的客户 | 11,900+（一年前 950+） |
| 在用芯片家族 | AWS Trainium、Google TPU、NVIDIA GPU、AMD GPU |
| 最大的一笔硬件承诺 | 与 Broadcom 的五年期设备租约，共 $161.2B，用于 TPU 算力；作为附件 10.11 公开的那份租约买的是 **TPU8i pod** |

![每 $1 算力换来多少收入](/assets/s1/revenue-per-compute-zh.svg)

六个季度里，每 $1 算力换来的收入从 $0.40 涨到 $2.08。S-1 把功劳归给三件事：训练效率、推理效率（研究带来的 "compute multipliers" 加上工程优化），以及跨四种芯片的统一编排层。

一个较少被提到的数字：上半年 $8.9B 算力里，**直接服务付费客户的部分（营业成本）最多约 $2.4B，大约四分之一**。

![2026 上半年算力去向](/assets/s1/compute-split-zh.svg)

但这不等于推理只占四分之一。S-1 说 2026 年 9 月公司代码库里超过 90% 的提交由 Claude 写成；内部使用 Claude 和免费用户的用量记在研发和市场费用里，本质上也是推理。而且 Anthropic 把所有算力当作一个可互换的池子调度：**省下的每一份推理算力，都会变成训练和研究的算力。**对前沿实验室来说，推理效率就是研发速度。

## 一、Agentic 推理的 TAM：按任务定价，按算力付账

S-1 没有按 token 讲市场，而是按知识工作讲：2025 年全球知识工作的经济价值超过 $40 万亿。收入按完成的工作挣，账单按加速器小时付。

Agent 会把这两者的差距拉大。S-1 在风险因素里说，agentic 产品涉及多步推理、反复调用工具、长上下文和持续会话，每次交互消耗的算力明显高于对话；随着 agent 占比上升，算力需求可能比收入涨得更快。用户层面也能看到：不用 Claude Code 的企业用户平均每月花不到 $75，而用 Claude Code 的前 5% 用户花费约 20 倍。

粗算一下（我的假设，不是招股书的数字）：如果 AI 拿下 $40 万亿知识工作中的 5%，就是每年约 $2 万亿收入；按今天约 2:1 的收入/算力比，对应每年约 $1 万亿算力，而且推理占比会随 agent 增加而上升。

附件告诉我们这些算力流向哪里。招股书里最大的一笔硬件承诺，是与 Broadcom 的设备租约，**五年共 $161.2B**。作为附件 10.11 公开的那份租约，标的是 "Local TPU8i Pods"。TPU8i 是 Google 第八代 TPU 里专做推理的那颗，Google 在 [4 月发布](https://datacenterdynamics.com/en/news/google-unveils-eighth-generation-tpus-two-dedicated-training-and-inference-chips)时首次把训练和推理拆成两颗芯片。据 Google 介绍，它配了 [384 MB 片上 SRAM](https://interestingengineering.com/ai-robotics/google-tpu-8t-8i-ai-chips-launch) 和 288 GB HBM，目标是以低延迟同时运行大量 agent。这份租约里甚至有一条「与内存相关的 TPU 涨价」转嫁条款。

![S-1 披露的算力承诺，按芯片家族](/assets/s1/commitments-by-chip-zh.svg)

所以专用推理芯片已经不是假设。**Anthropic 最大的硬件承诺是 TPU 算力，而唯一全文公开的那份租约，买的是一颗把内存拉近计算单元的推理芯片。**这正是 LPU 式芯片最早走的方向。

对芯片初创公司，这里有个前提。Anthropic 的算力是一个池子，由自研编排层调度，这个编排层会用 Anthropic 的真实负载去测试和度量每种芯片。一颗芯片单纯「快」进不来；它得在第一天就可调度、可度量、跑得对。**对推理芯片来说，软件栈是入场券。**

## 二、芯片和模型的协同设计：我们在优化低了一层的指标

S-1 反复提到「每任务成本」：Opus 5.5 比 Opus 5 的每任务成本降低约 40%；Fable 5.1 的典型负载成本降低约 25%，复杂编程和高度 agentic 的任务最多降低 45%。下降来自降价和模型效率提升的组合。

把这个指标拆开：

> 每个**成功**任务的成本 =（每任务 token 数 × 每 token 成本）÷ 任务成功率

芯片只优化中间那一项。模型和 agent 框架决定另外两项，而 S-1 说 Anthropic 的提升主要来自算法。协同设计的空间，在于把芯片的目标从「每 token」推到「每任务」：

- **延迟会逐步累加。** 一个 agent 任务是几十到几百步「计划—调用工具—观察」的循环，每一步都要等上一步 decode 完成。单流 decode 速度和**可预测的延迟**，决定整个任务的耗时。S-1 列出了 "Fast Mode"，说明低延迟已经是可以单独售卖的产品。
- **上下文跨轮复用。** prompt caching 对长提示可把成本降低最多约 97%、延迟降低约 60%。在 agent 里 KV cache 大部分是复用的，存储层次比峰值算力更重要。
- **每个请求的计算量会变。** 自适应思考和 effort 控制意味着同一个模型、不同请求的计算量可以相差很大，调度器和编译器要能应对。
- **工具调用占真实时间。** 一项基于 vLLM 的研究发现，工具调用占首个响应延迟的 30–80%（[Sutradhara](https://arxiv.org/html/2601.12967v1)）。把工具执行和下一轮 prefill 重叠，是系统层面的协同设计。

商业上，Anthropic 从两头都把协同设计当作护城河。它说自己会影响四家芯片供应商下一代产品的路线图，并直接与 NVIDIA 合作，按自己的负载特征优化未来的硬件。风险因素里也提醒：拥有自研芯片的对手可能做出 "proprietary hardware-software co-designs"，在每一代模型上拉大能力差距。

对独立芯片公司也有好消息。S-1 说借助 Claude，把一个新芯片平台推进生产所需的时间只剩过去的一小部分。移植成本在下降，新架构有了机会，前提是编译器和运行时足够好，让模型不用大量手工调优就能跑对、跑快。

## 三、Transformer 会一直是主流吗？芯片怎么跟上？

S-1 里能看到模型迭代有多快：Mythos 和 Fable 5 在 2026 年 6 月发布，5.1 在 9 月，Opus 5.5 也在 9 月，大约一个季度一代。芯片要两三年。Anthropic 通常提前 12–18 个月签算力合同，合同期最长可达 20 年，它自己的风险因素也提醒：已承诺的算力可能被未来更高效的方案比下去。

再看前沿实验室之外最火的东西。9 月 15 日，TypeSafe AI 发布了 [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)，一个 "System One" 模型。它不生成文本：输入程序状态和带类型的问题，一次并行前向就返回带置信度的决策，耗时几十到几百毫秒。Vercel 的数据显示，上线两周就有 [35% 的付费团队在用](https://techcrunch.com/2026/10/16/jev-is-vercels-fastest-adopted-ai-model-ever/)。据报道它底层仍是 transformer，但负载形态和对话完全不同：**根本没有自回归 decode**，只有一次类似 prefill 的计算，嵌在 agent 循环里做分类、路由或监控。

S-1 指向同一个方向。Claude 分四个档位（Mythos/Fable、Opus、Sonnet、Haiku），Sonnet 被明确定位为多 agent 编排中的「高并发子 agent」。未来的 agent 系统很可能是：一个前沿的 "System 2" 规划模型，加上大量小模型做执行，再加上循环里快速的 "System 1" 决策模型。至于之后是 JEPA、状态空间模型还是混合架构，没人知道。

所以芯片不该押注某一个模型，而应该：

1. **只把不变的东西做进硅片**：数据搬运、每条流的内存带宽、确定性调度。
2. **让编译器吸收变化**：新模型意味着重新编译，而不是重新流片。确定性、编译器静态调度的架构在这点上有天然优势：重 decode 的 agent 和没有 decode 的决策模型，只是两张不同的计算图。
3. **瞄准执行层**：子 agent、小模型和 System 1 调用需要快速、便宜、可预测的推理，这正是专用推理芯片的长处。

不管是不是 transformer，**路由器决定谁赢**。能留在池子里的芯片，是编排层容易调度、新模型发布当周就能跑起来的芯片。

## 为什么我关心这些

我在一家 AI 芯片初创公司负责软件栈，我们做的是一颗 LPU 式、确定性、由编译器调度的推理芯片，目标正是 agentic 负载下的每任务成本和端到端速度。如果你在做编译器、推理系统或 agent 推理优化，欢迎联系，我们在招人。

---

*本文只使用公开资料，观点仅代表个人，不构成投资建议。来源：Anthropic S-1 及附件（[SEC EDGAR](https://www.sec.gov/Archives/edgar/data/2130357/000162828026067168/0001628280-26-067168-index.htm)，2026-10-26）；TPU8i 参数见 [DCD](https://datacenterdynamics.com/en/news/google-unveils-eighth-generation-tpus-two-dedicated-training-and-inference-chips) 与 [Interesting Engineering](https://interestingengineering.com/ai-robotics/google-tpu-8t-8i-ai-chips-launch) 对 Google 发布的报道；Jev 见 [TypeSafe AI](https://typesafe.ai/blog/introducing-system-one-models-and-jev) 与 [TechCrunch](https://techcrunch.com/2026/10/16/jev-is-vercels-fastest-adopted-ai-model-ever/)。图表为作者根据 S-1 数据绘制。*
