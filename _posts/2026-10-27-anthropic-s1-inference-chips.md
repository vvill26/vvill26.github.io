---
layout: post
title: "From cost per token to cost per task: reading Anthropic's S-1 for inference chips"
date: 2026-10-27 12:00:00 +0800
permalink: /2026/10/anthropic-s1-inference-chips/
lang: en
description: "The most important phrase in Anthropic's S-1 for chip builders isn't $16.3B of revenue. It's cost per task, and the largest hardware line in the filing is an inference chip."
---

{% include lang-switch.html en="/2026/10/anthropic-s1-inference-chips/" zh="/zh/2026/10/anthropic-s1-inference-chips/" %}

Anthropic filed its S-1 on October 26, 2026. Most coverage focuses on revenue, losses and valuation. Read from the perspective of an inference software stack (compilers and serving systems such as vLLM and SGLang), one shift stands out: **Anthropic now describes its product economics in cost per task, while chip benchmarks are still mostly quoted in tokens per second and tokens per watt.**

## At a glance

<div class="glance" markdown="1">

**The most important phrase in Anthropic's S-1 isn't "$16.3B of revenue." It's "cost per task."** Three ideas, one thread:

**1. Agentic inference TAM: priced in tasks, paid for in compute**

- The market is sized against knowledge work and revenue is earned per finished task, but the bill is paid in accelerator-hours. Agent loops (multi-step reasoning, tool calls, long contexts) use far more compute per interaction than chat.
- Illustration only: if AI captured 5% of $40T of knowledge work at today's ~2:1 revenue-to-compute ratio, compute spend would be about $1T a year.
- Purpose-built inference silicon is already here: the one Broadcom lease filed in full buys TPU8i pods, Google's inference chip. But in a fungible compute pool, a chip earns its slot by fitting the orchestration layer, not by speed alone. For an inference chip, software is the entry ticket.

**2. Chip–LLM co-design: chips are optimized one level below where value is measured**

- Cost per successful task = (tokens per task × $/token) ÷ success rate. Chips optimize $/token; labs optimize the other two terms, mostly through algorithms ("compute multipliers").
- The gap lives in the agent loop, where today's chip benchmarks don't look: latency that adds up over hundreds of sequential steps, KV/prefix reuse across turns, and time spent waiting on tool calls.
- Labs with captive silicon get co-design built in, and the S-1 names this as a competitive risk. Independent chips have to win co-design through the compiler and runtime.

**3. Model churn vs. slow silicon: build for what stays constant**

- Models now turn over roughly every quarter; chips take 2–3 years. Anthropic itself flags the risk of committed hardware being overtaken.
- Don't hardwire the architecture. Hardwire what persists (data movement, memory bandwidth per stream, deterministic scheduling) and let the compiler adapt.
- The likely shape: one frontier planner plus many small or domain-specific workers and fast decision models, routed per step. Transformer or not, the router picks the winner.

</div>

The sections below walk through the evidence from the filing.

## The numbers that matter for chips

| From the S-1 | |
|---|---|
| H1 2026 revenue | $16.3B (H1 2025: $1.2B) |
| Q2'26 revenue / compute expense | $11.6B / $5.6B = **$2.08 per $1 of compute** |
| Q2'26 growth, year on year | revenue +1,368%, compute +300% |
| Customers paying ≥ $100K a year | 11,900+ (950+ a year earlier) |
| Chip families in production | AWS Trainium, Google TPU, NVIDIA GPU, AMD GPU |
| Largest single hardware line | Five-year Broadcom leases, $161.2B, for TPU-based capacity; the lease filed as Exhibit 10.11 is for **TPU8i pods** |

![Revenue per $1 of compute](/assets/s1/revenue-per-compute-en.svg)

In six quarters, revenue per compute dollar went from $0.40 to $2.08. The S-1 credits three things: training efficiency, inference efficiency (research "compute multipliers" plus production engineering), and one orchestration layer across four chip families.

A number that gets less attention: of $8.9B of compute in H1 2026, **serving paying customers (cost of revenue) was at most about $2.4B, roughly a quarter.**

![Where H1 2026 compute went](/assets/s1/compute-split-en.svg)

That doesn't mean inference is only a quarter of the bill. The S-1 says Claude wrote over 90% of the contributions to Anthropic's codebase in September 2026. Internal Claude use and the free tier are booked under R&D and marketing, but they are inference too. And because Anthropic runs all compute as one fungible pool, **every unit of inference it saves becomes training and research capacity.** For a frontier lab, inference efficiency is research speed.

## 1. Agentic inference TAM: priced in tasks, paid for in compute

The S-1 doesn't size its market in tokens. It sizes it in knowledge work: more than $40 trillion of economic value in 2025. Revenue is earned per unit of finished work, but the bill is paid in accelerator-hours.

Agents widen that gap. In its risk factors, the company says agentic products, with multi-step reasoning, repeated tool calls, long contexts and sustained sessions, use significantly more compute per interaction than chat, and that compute could grow disproportionately to revenue as agents take a bigger share. You can see it per user: enterprise users without Claude Code averaged under $75 a month, while the top 5% of Claude Code users spent about 20 times that.

An illustrative estimate (not from the filing): if AI captured 5% of $40T of knowledge work, that is about $2T a year in revenue. At today's roughly 2:1 revenue-to-compute ratio, it implies about $1T a year of compute, with inference's share rising as agents take over.

The exhibits show where that compute is headed. The biggest single hardware commitment in the filing is a set of Broadcom equipment leases worth **$161.2B over five years**. The lease filed as Exhibit 10.11 covers "Local TPU8i Pods". TPU8i is the inference half of Google's eighth-generation TPU, [announced in April](https://datacenterdynamics.com/en/news/google-unveils-eighth-generation-tpus-two-dedicated-training-and-inference-chips) as a split between training and inference chips. Google says it pairs [384 MB of on-chip SRAM](https://interestingengineering.com/ai-robotics/google-tpu-8t-8i-ai-chips-launch) with 288 GB of HBM and is built to run large numbers of agents at low latency. The same lease even has a clause passing through "memory-related" TPU price increases.

![Named compute commitments by chip family](/assets/s1/commitments-by-chip-en.svg)

So purpose-built inference silicon is no longer a hypothesis. **Anthropic's largest hardware commitment is TPU capacity, and the one lease filed in full buys an inference chip that moves memory closer to compute.** SRAM-centric inference designs such as Groq's LPU took a similar direction earlier.

There's a caveat for chip startups. Anthropic's compute is a pool, routed by a proprietary orchestration layer that tests and measures each chip against Anthropic's actual workloads. Being fast doesn't get a chip into that pool. It gets in by being schedulable, measurable and correct on day one. **For an inference chip, the software stack is the ticket in.**

## 2. Chip–LLM co-design: optimized one level below where value is measured

The S-1 keeps coming back to cost per task. Opus 5.5 cut customers' cost per task by about 40% versus Opus 5. Fable 5.1 cut typical workload costs by about 25%, and by up to 45% for complex coding and highly agentic tasks. Both came from a mix of lower prices and better model efficiency.

Break the metric down:

> cost per **successful** task = (tokens per task × cost per token) ÷ task success rate

Chips optimize the middle term. Models and agent harnesses own the other two, and the S-1 says most of Anthropic's gains come from algorithms. The room for co-design is in moving the chip's target from per-token to per-task:

- **Latency adds up across steps.** An agent task is tens to hundreds of plan → tool → observe steps, and each waits for the previous decode. Single-stream decode speed and *predictable* latency set how long the whole task takes. The S-1 lists "Fast Mode", so low latency is already a product you can sell.
- **Context gets reused across turns.** Prompt caching cuts cost by up to about 97% and latency by about 60% on long prompts. In agents, the KV cache is mostly reused, so the memory hierarchy matters more than peak FLOPs.
- **Compute per request varies.** Adaptive thinking and effort controls mean one model can need wildly different compute per request, and the scheduler and compiler have to cope with that.
- **Tool calls take real time.** A vLLM-based study found tool calls take 30–80% of first-response latency ([Sutradhara](https://arxiv.org/html/2601.12967v1)). Overlapping tool execution with the next prefill is co-design at the system level.

On the business side, Anthropic treats co-design as a moat in both directions. It says it influences the roadmaps of future chip generations at all four vendors, and it works directly with NVIDIA to tune future hardware "for our workload profile." Its risk factors also warn that rivals with their own silicon could build "proprietary hardware-software co-designs" that widen the capability gap with each model generation.

There's good news for independent chip companies too. Using Claude, Anthropic says it can now bring a new chip platform into production in a fraction of the time it used to take. Porting costs are falling. That opens the door to new architectures, as long as the compiler and runtime let models run correctly and fast with little hand-tuning.

## 3. Model churn vs. slow silicon: build for what stays constant

The S-1 shows how fast models move. Mythos and Fable 5 shipped in June 2026, 5.1 in September, and Opus 5.5 also in September: roughly one generation per quarter. Chips take two to three years. Anthropic typically contracts compute 12–18 months ahead, on terms that run as long as 20 years, and its own risk factors warn that committed compute may become less efficient than future alternatives.

Look at what's popular outside the frontier labs. On September 15, TypeSafe AI released [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), a "System One" model. It generates no text: it takes program state plus typed questions and returns calibrated decisions in one parallel pass, in tens to hundreds of milliseconds. Vercel data showed it [in use by 35% of paid teams](https://techcrunch.com/2026/10/16/jev-is-vercels-fastest-adopted-ai-model-ever/) within two weeks of launch. It's reportedly still transformer-based, but its workload looks nothing like chat: **no autoregressive decode at all**, just a prefill-style pass sitting inside agent loops as a classifier, router or monitor.

The S-1 points the same way. Claude ships in four classes (Mythos/Fable, Opus, Sonnet, Haiku), and Sonnet is explicitly positioned for "high-volume sub-agents" in multi-agent setups. A future agent system probably looks like a frontier "System 2" planner, many smaller workers, and fast "System 1" decision models in the loop. Whether JEPA-style, state-space or hybrid architectures follow, nobody knows.

So a chip shouldn't bet on one model. It should:

1. **Put only the invariants in silicon:** data movement, memory bandwidth per stream, deterministic scheduling.
2. **Let the compiler absorb change.** A new model should mean a recompile, not a respin. Deterministic, compiler-scheduled architectures have a natural edge here: a decode-heavy agent and a decode-free decision model are just different graphs.
3. **Target the execution tier.** Sub-agents, small models and System 1 calls need fast, cheap, predictable inference. Purpose-built inference chips are a natural fit for this tier.

Transformer or not, **the router picks the winner.** The chips that stay in the pool are the ones an orchestration layer can schedule easily and that run a new model the week it ships.
