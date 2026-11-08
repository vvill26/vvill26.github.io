---
layout: post
title: "Your turn: design an inference chip, then meet the real ones"
date: 2026-11-15 09:00:00 +0800
permalink: /2026/11/design-an-inference-chip/
lang: en
description: "A small game: pick a constraint, choose six mechanisms, see who pays and which real chip your design resembles. Then six design cards from public sources, and a blind test."
---

{% include lang-switch.html en="/2026/11/design-an-inference-chip/" zh="/zh/2026/11/design-an-inference-chip/" %}

<link rel="stylesheet" href="/assets/chip-radar/game.css">

Monday morning, back in forward mode. [Last time](/2026/11/inference-chip-shapes/) I read 43 inference chips backwards: take the shipped design, guess what its team thought was scarce. This time you hold the pen. Pick a constraint, make six decisions, and see which real team already made the same bet.

<div id="chip-game"></div>

**How it works.** Each mechanism lifts some of the ten axes from the last post; the shape is the highest level any of your choices reaches. Each mechanism also moves cost to someone: the hardware (area, power, packaging), the compiler (scheduling, memory placement) or the serving system (routing, transfers, operations). The budget is per constraint card. The dashed outline is the nearest of the 43 scored chips. Nothing here is a verdict: it is a toy model, and the point is the trade-offs, not a score.

Three things usually happen on the first try.

1. **You go over budget.** Pick the strongest option in every row and the bill lands everywhere at once. That is the committee chip from the last post: every axis at 5, nobody willing to pay.
2. **Cost moves instead of disappearing.** A fully static schedule makes the hardware cheap and the compiler expensive. Splitting prefill from decode makes each chip simpler and the serving layer harder. The total rarely drops much; who pays changes.
3. **Different constraints reward opposite choices.** The design that passes *Agent decode* fails *Laptop / phone*, and the one that passes *Many fine-tunes* fails both. That is the backward study, run forward: the shapes differ because the scarce thing differs.

## Six design cards

Every mechanism in the game was a real decision. A design card records one such decision in five fields: the **constraint**, the **mechanism**, the obvious **alternative** that was not taken, the **cost** and who carries it, and **what would change our mind**. The last field matters most: a radar score can only be argued with, but a card can be wrong.

All six use public sources only. Where the rationale is my inference and not the designers' own words, the card says so.

<a id="card-v4"></a>
### 1. TPU v4: optical circuit switches

- **Constraint.** Google wanted four times as many chips as TPU v3, 4,096 in one system. At that size a fixed torus is rarely all healthy: the paper puts host unavailability at 0.1 to 1 percent of the time.
- **Mechanism.** A 3D torus wired through optical circuit switches. The paper describes the switch as a plugboard that skips failed units and reshapes slices.
- **Alternative not taken.** A fixed electrical torus, or a packet-switched fabric such as InfiniBand.
- **Cost.** Optics and switches stay under 5 percent of system cost and 3 percent of power. Slices must be reconfigured per job, so scheduling software carries the work.
- **What would change our mind.** Nothing yet. The paper says scale and reliability came first, and faster LLM training from flexible topologies came later. Ironwood still uses the switches at 9,216 chips. If a future pod dropped them at the same scale, availability was not the binding constraint.

Sources: [Jouppi et al., ISCA 2023](https://arxiv.org/abs/2304.01433); [Ironwood at Hot Chips 2025](https://www.servethehome.com/googles-ironwood-tpu-swings-for-reasoning-model-leadership-at-hot-chips-2025/)

<a id="card-v4i"></a>
### 2. TPU v4i: air cooling as a design rule

- **Constraint.** An inference chip deployable in every Google datacenter, judged on performance per total cost of ownership, not per purchase price.
- **Mechanism.** One TensorCore on a die under 400 mm², 175 W, air-cooled. 128 MB of on-chip CMEM keeps weights close. Multi-tenancy with model switches under 100 µs.
- **Alternative not taken.** Reuse the training chip for serving.
- **Cost.** Less peak compute per chip and only two ICI links, so large models do not fit on one chip. The compiler manages the extra on-chip memory.
- **What would change our mind.** This card has a live tension: Ironwood, Google's inference TPU five years later, is liquid-cooled. Either the air-cooling rule was about the 2020 fleet and not about inference, or the constraint changed when models grew. The second reading fits the data better, but it is a reading.

Source: [Jouppi et al., ISCA 2021](https://conferences.computer.org/iscapub/pdfs/ISCA2021-4ghucdBnCWYB7ES2Pe4YdT/333300a001/333300a001.pdf)

<a id="card-sn40l"></a>
### 3. SambaNova SN40L: a third memory tier

- **Constraint.** *Composition of Experts*: many small models, where the output of one picks the next. On conventional hardware, switching models means reloading weights, and keeping all of them resident is expensive.
- **Mechanism.** Three tiers attached to the chip: 520 MiB of on-chip SRAM, 64 GiB of HBM, up to 1.5 TiB of DDR. Models move from DDR to HBM at over 1 TB/s per node.
- **Alternative not taken.** Keep every expert in HBM across many GPUs.
- **Cost.** DDR controllers and pins on a chip that is already large, and software that decides which model lives in which tier. The paper reports up to 19 times smaller machine footprint and 15 to 31 times faster model switching against DGX systems, by its own measurement.
- **What would change our mind.** If many-model serving stays rare, the DDR tier is cost without use. One data point so far: SN50 kept the three tiers.

Source: [Prabhakar et al., 2024](https://arxiv.org/abs/2405.07518)

<a id="card-sn50"></a>
### 4. SambaNova SN50: prefill here, decode there

- **Constraint.** Agentic workloads where per-user decode speed sets the experience, while prefill is compute-heavy and bursty.
- **Mechanism.** GPUs do prefill, SN50 does decode, and the KV cache moves between them once per request. SambaNova's July 2026 demo paired 4 H200s for prefill with 16 SN50s for decode.
- **Alternative not taken.** One chip type for both phases.
- **Cost.** A KV transfer per request over the network, two software stacks, and an operations team that runs both. The serving layer pays.
- **What would change our mind.** Independent long-context measurements. SambaNova itself reports results that differ between short and long contexts, and the link between the two sides is not disclosed. SN50 is announced, with shipping planned for the second half of 2026.

Sources: [SambaNova SN50 introduction](https://sambanova.ai/blog/introducing-the-sn50-rdu-purpose-built-for-agentic-inference); [SambaNova demo](https://sambanova.ai/blog/sn50-runs-fastest-minimax-speeds-in-the-world)

<a id="card-m5"></a>
### 5. Apple M5: two engines for AI

- **Constraint.** On-device AI at laptop and phone power: always-on system features and bursty language-model work on the same chip, within the same memory.
- **Mechanism.** Two places to run AI. A 16-core Neural Engine stays the energy-efficient path. New in M5, each of the ten GPU cores gets its own Neural Accelerator, and Apple's own M5 language-model study runs there through MLX and Metal 4, not on the Neural Engine.
- **Alternative not taken.** Grow the Neural Engine to cover large language models.
- **Cost.** Two programming paths, Core ML and Metal or MLX, sharing 153 GB/s of unified memory. Apple's numbers show the limit: prompt processing 3.3 to 4 times faster than M4, decode only 1.2 to 1.3 times, roughly the memory-bandwidth gain. The framework layer pays.
- **What would change our mind.** Apple has not said why it split the work; the constraint above is my inference. If a later generation moves language models onto the Neural Engine, the split was a transition, not a design rule.

Sources: [Apple Newsroom, M5](https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/); [Apple ML Research, LLMs on the M5 GPU](https://machinelearning.apple.com/research/exploring-llms-mlx-m5)

<a id="card-lpx"></a>
### 6. Rubin + LPX: the handoff

- **Constraint.** Long-context, highly interactive decode, where HBM bandwidth per user limits tokens per second on the GPU.
- **Mechanism.** Groq 3 LPX racks next to Vera Rubin racks. Each LP30 chip carries 500 MB of SRAM. NVIDIA describes three ways to cut the work: prefill on the GPU and decode on LPX; attention on the GPU, which keeps the KV cache, and FFN or MoE experts on LPX; or a small draft model on LPX that the GPU verifies.
- **Alternative not taken.** Make the GPU itself SRAM-heavy, giving up capacity and generality.
- **Cost.** The attention/FFN cut moves activations at every full-attention layer, on the per-token critical path. The serving system and the network pay.
- **What would change our mind.** Measured end-to-end results. LPX on its own is measured; NVIDIA's joint result for a 2-trillion-parameter model is a projection.

Sources: [NVIDIA: inside Groq 3 LPX](https://developer.nvidia.com/blog/inside-nvidia-groq-3-lpx-the-low-latency-inference-accelerator-for-the-nvidia-vera-rubin-platform); [NVIDIA: LPX at long context](https://developer.nvidia.com/blog/how-nvidia-groq-3-lpx-unlocks-ultrafast-interactivity-at-long-context-on-nvidia-vera-rubin/)

## Read the shape, guess the team

The last post claimed that a chip shows where its designers came from. Here is a small test of that claim. Four chips, names hidden. Which background built each one?

<div id="chip-blind"></div>
<script src="/assets/chip-radar/data.js"></script>
<script src="/assets/chip-radar/game.js"></script>

With four options and four chips, random guessing gets one right on average. If readers do much better, the shape carries information about the team. If not, the workload explains the shape and the background is a story told afterwards. Tell me your score.

## Caveats

- The game is a toy. Axis levels, costs and budgets are my simplifications, chosen so that the archetypes land near their real counterparts; they are not measurements.
- The radar scores come from the [previous post](/2026/11/inference-chip-shapes/), with its sources and its known weaknesses.
- No combination is scored as the best one, on purpose. Each card describes one trade-off, not a ranking.

The weekend study gave me a checklist; this post turns it into a game. Back to forward mode.
