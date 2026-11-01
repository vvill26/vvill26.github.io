---
layout: post
title: "Humans as the brain, AI as the hands: what Anthropic's Rust port means for AI chip software"
permalink: /2026/10/humans-brain-ai-hands/
lang: en
series: "Chip software in the AI era (2/3)"
description: "A team with no Rust engineers ported a production API to Rust with AI writing most of the code. For AI chip companies the lesson is twofold: the bottleneck moves from writing code to proving it right, and the infrastructure your agents run on becomes part of the product."
---

{% include lang-switch.html en="/2026/10/humans-brain-ai-hands/" zh="/zh/2026/10/humans-brain-ai-hands/" %}

*Part 2 of 3. [Part 1](/2026/11/you-cant-avoid-the-hard-part/) asked when a big swing beats the safe path. This post looks at one big swing that worked and what it means for building chip software.*

Anthropic recently rewrote the Claude Messages API, moving it from a Python monolith to Rust. The team had no Rust engineers when it started, and Claude wrote most of the code. The reported savings are large, but the useful part is elsewhere: what the humans did instead of writing code, and what kind of infrastructure that way of working needs. Both map directly onto how an AI chip company builds its compiler, runtime and serving stack.

## At a glance

<div class="glance" markdown="1">

**When AI writes most of the code, two things change: the bottleneck moves from writing code to proving it right, and the infrastructure agents run on becomes part of the product.**

- **What happened:** a full Python-to-Rust port of a production API, with the implementation mostly done by AI. Humans owned the architecture, the migration plan and verification. Reported results: CPU use down about 40–50%, time to first token down about 10–20%.
- **The split:** humans are the brain (specification, architecture, proof of equivalence); AI is the hands (implementation).
- **For compilers and tooling:** build the differential-testing harness first, take on the rewrites you used to avoid, automate keeping up with upstream, use deterministic hardware as a clean signal for agents, and count host-side CPU in cost per task.
- **For the company:** a shared, orchestrated agent infrastructure matters as much as the chip and the compiler. Engineers who each work with their own AI tools, in silos, move fast alone and slow down at integration, especially for a large AI pod.

</div>

## 1. What happened

Katelyn Lesse, who leads platform engineering at Anthropic, described the project on the [Latent Space podcast](https://latent.space/p/how_anthropic_ships_the_1_llm_in_the_world_safely_separating_the_brain_from_the_hands/) on October 27, the day after a longer [essay on X](https://x.com/katelyn_lesse/status/2114542280535318557) about the engineering problems agents create.

- **Why:** CPU capacity had become a constraint, and a Python monolith uses a lot of it. Rust was the obvious technical choice, but nobody on the team knew it.
- **How:** humans designed the system and planned the migration; Claude did most of the implementation. It was kept a strict *port*, with no new features. Other teams kept adding features to the Python version, so static analysis flagged each one that also needed a Rust counterpart.
- **Verification:** shadow traffic. The Rust service received the same requests as the Python one, outputs were compared, and real traffic moved over gradually.
- **Results, as reported:** CPU use down about 40–50% and time to first token down about 10–20%, with bigger gains on longer workloads.

Lesse says she would never have approved a migration like this in the past. A rewrite of this size would have been split up and moved over years. It is the kind of big swing Part 1 described: AI made it affordable.

## 2. Humans are the brain, AI is the hands

The speed-up itself isn't surprising. Moving from Python to Rust cuts CPU use a lot with or without AI. What's new is that a team without Rust expertise finished a full rewrite in about a year, because it was clear about what humans still had to own:

- **Architecture.** It is still a distributed system, and someone has to decide its shape.
- **Definition of done.** "Behaves exactly like the old system" has to be made precise.
- **Proof of equivalence.** A mechanism that shows, on real inputs, that the new system matches the old one.
- **Scope discipline.** No new features until the port is finished.

Everything else was the hands. **Code got cheap; proof didn't.** The team's real output was the plan and the verification setup.

![Humans as the brain, AI as the hands](/assets/brain-hands/port-loop-en.svg)

## 3. What this means for AI chip compilers and tooling

A chip software stack is full of work that looks like this port: large bodies of code to rewrite, retarget or keep in sync with something else.

**1. Differential testing is your shadow traffic.** For a compiler, the equivalent of comparing Python and Rust outputs is running a reference (PyTorch eager, or a GPU) and your compiled output on the same inputs. Add random graph and shape fuzzing, and agree numeric tolerances per op in advance. Build this harness before letting AI touch the backend. Without it, AI-written compiler code is a liability. With it, it's leverage.

**2. Rewrites you used to avoid are back on the table.** Moving the backend onto MLIR instead of patching an old IR. Moving the host runtime or serving glue from Python to Rust or C++. Porting the whole kernel library at once for a new chip generation. Rewriting the performance model or simulator in a faster language. Same discipline each time: freeze features, run old and new side by side, compare, cut over.

**3. Keep up with upstream automatically.** vLLM and SGLang change every week. The static-analysis trick that kept Python and Rust in sync works here too: on each rebase, CI compares new ops, model architectures and scheduler features with what the backend covers, flags the gaps, and agents draft the missing pieces for review.

**4. Deterministic hardware gives agents a clean signal.** Agents improve by trying and measuring. On a deterministic, compiler-scheduled chip, a simulator reports exact cycle counts, so agents searching tilings, schedules and memory layouts get a noise-free score for every attempt. On hardware with dynamic scheduling, every measurement needs repeated runs and statistics.

**5. More evals than you think, starting simple.** Lesse's advice is that most teams need more evals than they expect, and the common mistake is debating frameworks and ending up with none. A compiler's first version can be a fixed per-workload suite covering correctness, performance and compile time, run on every agent-made change.

**6. Count host-side CPU in cost per task.** Anthropic's port was driven by CPU cost, and inference serving has the same issue on the host. In an [earlier post on Anthropic's S-1](/2026/10/anthropic-s1-inference-chips/) I argued that value is now measured per task, not per token: cost per successful task = (tokens per task × cost per token) ÷ success rate. An agent task is tens to hundreds of sequential steps. Each step pays a host-side toll: scheduling, tokenizing a growing context, prefix matching, Python bookkeeping. A tokens-per-second benchmark on a single long decode hides that toll. Multiplied across hundreds of steps, it shows up in task latency and in the CPUs you have to buy next to every accelerator. The faster the chip, the bigger its share. Measure it per step and per task, not only per token.

## 4. The infrastructure is part of the product

"Brain and hands" is also how Anthropic describes its agent architecture. In [Claude Managed Agents](https://www.anthropic.com/research/managed-agents), the harness and the session log (the brain) run on trusted servers, while generated code runs in disposable sandboxes (the hands). Credentials sit in a vault and are injected by a proxy only as a request leaves the sandbox. The design began as a fix for latency and reliability; Lesse now calls security its most important benefit.

For an AI chip company, the bigger lesson is about who builds this kind of infrastructure, and when. **Building the infrastructure your engineers and agents work in is as important as designing the chip or writing the compiler.**

Here is the failure mode it prevents. Each engineer adopts AI tools on their own. The compiler engineer has an agent that is very good at the compiler. The runtime, driver, collective-communication and serving engineers each have theirs. Every one of them moves faster than before, in a silo. Each agent sees only its own repository, its own tests and its own idea of the interfaces around it.

That holds up until integration. An AI pod is a large system: chips, boards, interconnect, firmware, driver, runtime, compiler, collectives, the serving stack, the cluster software on top. Most of the hard bugs live at the boundaries between those parts. Siloed agents optimize locally and let the interfaces drift. Nobody's agent can reproduce a failure that needs three components at once. The speed gained in each silo gets spent, and then some, at integration.

An orchestrated harness makes the boundaries visible:

- **A shared session log.** Every agent's work is recorded in one place, so a pod-level failure can be traced across components and handed between agents and people.
- **Shared environments as tools.** Simulators, emulation, FPGA prototypes, reference GPUs and later real pods are exposed through one interface to every agent, and scheduled as the scarce resources they are.
- **Shared evals and interface contracts.** Pod-level regression suites and machine-checked interface specs, so an agent changing the runtime learns immediately that it broke the compiler's assumptions.
- **Security by design.** Generated code runs in sandboxes; credentials, tool licences and confidential IP stay outside, behind a proxy.
- **Tracing and a kill switch** for agent jobs that run for hours, and **CPU capacity planned like any other compute**, since compiling and simulating scale with the number of agents.

![From siloed AI tools to a shared harness](/assets/brain-hands/silos-vs-harness-en.svg)

This is not a side project for a platform team to pick up later. It decides how fast the whole product comes together, and it is far cheaper to build before integration starts than during it. [Part 3](/2026/11/agent-infra-chip-startup/) looks at how a small chip startup can build it in practice.

## 5. Caveats

- **The numbers are self-reported**, with no published method or baseline. Rust beating Python on CPU is expected regardless of AI.
- **Correlated errors.** If AI writes both the code and its tests, they can share the same misunderstanding. Keep the reference independent: written by humans, taken from the spec, or from a different implementation.
- **Review becomes the queue.** When agents produce ten times more code, human review is the bottleneck, which pushes teams toward more automated checking.
- **Context.** The speaker leads the platform she describes. The architecture is public and widely discussed, but the experience is one company's.

## Closing thought

Compilers for AI chips have always been judged on running correctly and running fast. As AI takes over more of the writing, what compounds is the infrastructure that proves both, and the shared harness that lets many agents and engineers work as one team. The companies that build those first get to use AI for the big rewrites, and for integration, while everyone else is still debugging the boundaries.
