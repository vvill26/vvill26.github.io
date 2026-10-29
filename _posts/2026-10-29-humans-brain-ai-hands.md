---
layout: post
title: "Humans as the brain, AI as the hands: what Anthropic's Rust port means for AI chip compilers"
date: 2026-10-29 12:00:00 +0800
permalink: /2026/10/humans-brain-ai-hands/
lang: en
description: "A team with no Rust engineers ported a production API to Rust with AI writing most of the code. The lesson for AI chip software isn't speed. It's that the bottleneck moves from writing code to proving it right."
---

{% include lang-switch.html en="/2026/10/humans-brain-ai-hands/" zh="/zh/2026/10/humans-brain-ai-hands/" %}

This week Katelyn Lesse, who leads platform engineering at Anthropic, described how her team rewrote the Claude Messages API, moving it from a Python monolith to Rust. The team had no Rust engineers when it started, and Claude wrote most of the code. The headline numbers are striking, but the more useful part is what the humans did instead of writing code. That maps closely onto how compilers and tooling for AI chips could be built from now on.

## At a glance

<div class="glance" markdown="1">

**When AI writes most of the code, the bottleneck moves from writing it to proving it right.**

- **What happened:** a full Python-to-Rust port of a production API, with the implementation mostly done by AI. Humans owned the architecture, the migration plan and verification. Reported results: CPU use down about 40–50%, time to first token down about 10–20%.
- **The split:** humans are the brain (specification, architecture, proof of equivalence); AI is the hands (implementation).
- **For AI chip compilers:** build the differential-testing harness first, take on the rewrites you used to avoid, automate keeping up with fast-moving upstreams, and use deterministic hardware as a clean signal for agents.
- **For your own dev agents:** keep the brain (harness, state, credentials) apart from the hands (sandboxes that run generated code).

</div>

## 1. What happened

Lesse covered the project on the [Latent Space podcast](https://latent.space/p/how_anthropic_ships_the_1_llm_in_the_world_safely_separating_the_brain_from_the_hands/) on October 27, alongside a longer [essay on X](https://x.com/katelyn_lesse/status/2114542280535318557) about the engineering problems agents create. The outline of the port:

- **Why:** CPU capacity had become a constraint, and a Python monolith uses a lot of it. Rust was the obvious technical choice, but nobody on the team knew it.
- **How:** the team designed the system and planned the migration, and Claude did most of the implementation. They kept it a strict *port*: no new features. Meanwhile other teams kept adding features to the Python version, so static analysis flagged each one that also needed a Rust counterpart.
- **Verification:** shadow traffic. The new Rust service received the same requests as the Python one, its outputs were compared, and real traffic moved over gradually.
- **Results, as reported:** CPU use down about 40–50% and time to first token down about 10–20%, with bigger gains on longer workloads.

Lesse also notes that in the past she would never have let a team do a migration like this. A rewrite of this size would normally be split into pieces and moved over the course of years. An earlier post of hers, ["You can't avoid the hard part"](https://www.katelynlesse.com/blog/you-cant-avoid-the-hard-part), sets out the reasoning: if the hard part can't be avoided, take the big swing rather than a safe path that only delays failure. AI changes which swings are affordable.

## 2. The real shift: humans are the brain, AI is the hands

The speed-up itself isn't the surprising part. Moving from Python to Rust would cut CPU use a lot without any AI. The new part is that a team without Rust expertise completed a full rewrite in about a year, by working out what humans still had to own:

- **Architecture.** It is still a distributed system, and someone has to decide its shape.
- **Definition of done.** "Behaves exactly like the old system" has to be made precise.
- **Proof of equivalence.** A mechanism that shows, on real inputs, that the new system matches the old one.
- **Scope discipline.** Saying no to new features until the port is finished.

Everything else was the hands. In short, **code got cheap and proof didn't.** The team's real output was the plan and the verification setup.

![Humans as the brain, AI as the hands](/assets/brain-hands/port-loop-en.svg)

## 3. What this means for AI chip compilers and tooling

A chip software stack is full of work that looks like this port: large bodies of code to rewrite, retarget or keep in sync with something else. Six takeaways:

**1. Differential testing is your shadow traffic.** For a compiler, the equivalent of comparing Python and Rust outputs is running a reference (PyTorch eager, or a GPU) and your compiled output on the same inputs. Add random graph and shape fuzzing, and agree numeric tolerances per op in advance. Build this harness before letting AI touch the backend. Without it, AI-written compiler code is a liability. With it, it's leverage.

**2. Rewrites you used to avoid are back on the table.** Every chip team has projects that were "never worth it": moving the backend onto MLIR instead of patching an old IR, moving the host runtime or serving glue from Python to Rust or C++, porting the whole kernel library at once for a new chip generation, rewriting the performance model or simulator in a faster language. Apply the same discipline: freeze features, run old and new side by side, compare, cut over.

**3. Keep up with fast-moving upstreams automatically.** vLLM and SGLang change every week. The static-analysis trick that kept Python and Rust in sync works here too: on each rebase, CI compares new ops, model architectures and scheduler features with what the backend covers, flags the gaps, and agents draft the missing pieces for review.

**4. Deterministic hardware gives agents a clean signal.** Agents improve by trying and measuring. On a deterministic, compiler-scheduled chip, a simulator reports exact cycle counts, so agents searching tilings, schedules and memory layouts get a noise-free score for every attempt. On hardware with dynamic scheduling, every measurement needs repeated runs and statistics.

**5. More evals than you think, starting simple.** Lesse's advice is that most teams need more evals than they expect, and the common mistake is debating frameworks and ending up with none. For a compiler, a first version can be a fixed per-workload suite covering correctness, performance and compile time, run on every agent-made change.

**6. Watch host-side CPU.** Anthropic's port was driven by CPU cost. Inference serving has the same issue on the host: the faster the accelerator, the bigger the share of per-token time spent in Python scheduling and bookkeeping. It is worth measuring before it shows up in a benchmark.

## 4. Brain and hands, literally: infrastructure for your own dev agents

"Brain and hands" is also how Anthropic describes its agent architecture. In [Claude Managed Agents](https://anthropic.com/engineering/managed-agents), the harness and session state (the brain) run on trusted servers, while generated code runs in disposable sandboxes (the hands). Credentials sit in a separate vault and are injected by a proxy only as a request leaves the sandbox, so code inside never sees them. The design began as a fix for latency and reliability; Lesse now calls security its most important benefit.

For a chip software team running its own coding agents, this translates directly:

- **Generated code runs in sandboxes**, with simulators or real hardware attached as tools.
- **Credentials, tool licences and confidential IP stay outside**, behind a proxy with controlled network access.
- **Tracing and a kill switch** for agent jobs that run for hours.
- **Plan CPU capacity.** Compiling and simulating are CPU-heavy, and the load grows with the number of agents.

## 5. Caveats

- **The numbers are self-reported**, with no published method or baseline. Rust beating Python on CPU is expected regardless of AI.
- **Correlated errors.** If AI writes both the code and its tests, they can share the same misunderstanding. Keep the reference independent: written by humans, taken from the spec, or from a different implementation.
- **Review becomes the queue.** When agents produce ten times more code, human review is the bottleneck, which pushes teams toward more automated checking.
- **Context.** The speaker leads the platform she describes. The architecture is public and widely discussed, but the experience is one company's.

## Closing thought

Compilers for AI chips have always been judged on two things: running correctly and running fast. As AI takes over more of the writing, what compounds is the infrastructure that proves both: golden references, differential tests, deterministic simulators and eval suites. The team that builds those first gets to use AI for the big rewrites everyone else keeps putting off.
