---
layout: post
title: "Building agent infrastructure at a chip startup: lessons from DeepSeek's superagent and Claude Managed Agents"
date: 2026-11-01 09:20:00 +0800
permalink: /2026/11/agent-infra-chip-startup/
lang: en
series: "Chip software in the AI era (3/3)"
description: "DeepSeek's dsh-superagent prototype and Anthropic's Claude Managed Agents address different layers of the same problem. A practical reading for a small AI inference chip startup with no legacy and no silicon yet, including what the infrastructure costs."
---

{% include lang-switch.html en="/2026/11/agent-infra-chip-startup/" zh="/zh/2026/11/agent-infra-chip-startup/" %}

*Part 3 of 3. [Part 1](/2026/11/you-cant-avoid-the-hard-part/) was about choosing the hard path. [Part 2](/2026/10/humans-brain-ai-hands/) argued that the infrastructure people and agents work in deserves the same priority as the chip and the compiler. This post asks how a small inference chip startup can build that infrastructure, and what it costs, when it has no legacy and no silicon until the first tapeout comes back.*

Two recent public designs make a useful pair. DeepSeek published [dsh-superagent](https://github.com/deepseek-ai/dsh-superagent-prototype), a proactive coding agent for a team's repository, built on its open-source agent runtime, DeepSeek Harness. Anthropic described the architecture of [Claude Managed Agents](https://www.anthropic.com/research/managed-agents), its hosted service for long-running agents. They are easy to read as competitors. They are better read as two layers of the same stack.

## At a glance

<div class="glance" markdown="1">

**DeepSeek's prototype addresses what work an agent should take on, for whom, and when it should involve a person. Managed Agents addresses how that work runs reliably and safely. A startup needs both layers.**

- **From DeepSeek:** work items with explicit authorization, an observe-before-acting mode, and a strict budget for human attention.
- **From Anthropic:** an append-only session log, one interface for every environment, disposable sandboxes, and credentials kept away from generated code.
- **For a pre-silicon startup:** put simulators, FPGA prototypes and reference GPUs behind that interface now, and budget the infrastructure as a first-class line: roughly $1–2 million a year for a 30-person software team.

</div>

## Two designs, two layers

**dsh-superagent** watches one GitHub repository and, optionally, Feishu chats. Its README calls it a research prototype rather than a product, and its organizing principle is to *take as little human attention as possible and give as much value as possible*. A message becomes a *ticket* only after an evaluation step accepts it under a versioned *policy*: who may ask, through which channel, and which written rules allow the agent to act on its own. Proactive work starts in an *observe* mode that only records what the agent would have done. Each ticket gets its own session and git worktree, concurrency is capped by worker slots with one always reserved for people, and pending actions are stored before they run so a restart resumes cleanly. The docs are equally candid about isolation: workers run with full access as the operator's OS user, and a dedicated account is recommended.

**Claude Managed Agents** separates three components that can fail or be replaced independently: the *session*, an append-only log of everything that happened; the *harness*, the loop that calls the model and routes tool calls; and the *sandbox*, where code runs. The harness reaches any environment through one interface, `execute(name, input) → string`, and a crashed harness restarts from the log with `wake(sessionId)`. Credentials stay in a vault behind a proxy, so neither the harness nor generated code holds them. Anthropic reports that median time to first token fell about 60% after this split, and p95 by more than 90%. This is the rebuilt system whose single-container first version Part 1 described.

| | dsh-superagent (DeepSeek) | Claude Managed Agents (Anthropic) |
|---|---|---|
| Layer | Team workflow: intake, authorization, attention | Runtime: sessions, execution, isolation |
| Unit of work | Ticket with a mandate under a versioned policy | Session with an append-only event log |
| Execution | One session and worktree per ticket, one machine | Stateless harnesses; sandboxes on demand |
| Isolation | Operator's OS user, full access | Sandboxes; credentials behind a proxy |
| Status | MIT-licensed research prototype | Commercial hosted service |

## What a chip startup should take from each

A startup has one structural advantage: nothing to migrate. These choices get much harder once teams have settled into the siloed habits Part 2 warned about.

**Adopt the interfaces, not a product.** Define your own session log, `execute`, `provision` and `wake` on day one, even if a hosted harness implements them for now. Harnesses go stale; interfaces last, along with the tools, evals and logs built on them.

**Make the front door explicit.** Work starts from a request in channels the team already uses, from people on an allowed list, and becomes a ticket with a recorded scope. Proactive work starts in observe mode. The agent acknowledges once, works quietly, then returns a result or one concrete question.

**Assemble the hands before the silicon.** Before tapeout, a startup already has the compiler, a functional simulator, a cycle-accurate model, reference GPUs, FPGA prototypes and shared emulation time. Put each behind the same interface and queue the scarce ones. When silicon returns, a bring-up board is simply one more hand: the same regressions run on day one, and the gap between model and silicon becomes a diff rather than an investigation.

**Isolate from the first day.** Full access is acceptable for a research tool, not next to RTL, foundry data under NDA or customer models. The baseline is one disposable sandbox per ticket, a credential proxy, an egress allowlist and an explicit rule about which data agents may see. Check which models and hosting regions the company can use; Anthropic has said Managed Agents can also use sandboxes on a customer's own infrastructure.

**Treat the session log as integration memory, and give it an owner.** One log across compiler, runtime, driver and serving agents turns pod-level failures into tickets with evidence attached. One or two engineers should run the platform as a product from the start.

![A starting architecture for a chip startup's agent infrastructure](/assets/agent-infra/startup-stack-en.svg)

## What it costs

None of this is free, and the costs look unlike anything in a traditional chip budget. Consider a 30-engineer software team before first silicon, using interactive coding agents and a modest fleet of background agents, priced at October 2026 list rates. The figures are an order of magnitude, not a quote.

| Item | Assumption | Per month |
|---|---|---|
| Interactive coding agents | 30 engineers at $250–$1,000 each | $7.5k–$30k |
| Background agents | 20 agents, 22 days, $30–$100 per agent-day | $13k–$44k |
| CPU for sandboxes, builds, simulation | 40 × 32-vCPU sandboxes around the clock, $0.02–$0.045 per vCPU-hour | $18k–$41k |
| Reference GPUs | Two 8-GPU H100 nodes at $3–$4 per GPU-hour | $35k–$46k |
| Storage, logs, networking | About 10% of the above | $7k–$16k |
| **Total** | | **about $80k–$180k** |

That is roughly $1–2 million a year, or $2,700–$5,900 per engineer per month. Anthropic's guidance puts average enterprise Claude Code use at [$150–$250 per developer per month](https://www.morphllm.com/claude-code-api-cost), with heavy API users reporting [$500–$2,000](https://www.cloudzero.com/blog/codex-vs-claude-code/). On-demand H100s had a [median price of about $4.20 per GPU-hour](https://uvik.net/blog/gpu-price-index/) in early October, and rental prices rose through 2026. Not included: FPGA and emulation systems, sold on quotation and often the largest single item; EDA licences; and the engineers who run the platform.

The shape of the spending matters more than the total. A traditional chip company budgets around headcount, EDA licences, IP, masks and the lab, and treats compute as IT overhead, on the assumption that output grows with the number of engineers. With agents, output grows increasingly with compute and tokens. The bill follows the work rather than the team, spikes at integration and bring-up, and a single runaway job can cost thousands of dollars overnight.

**AI infrastructure therefore has to be a first-class line in an AI chip company's plan, with the same standing as EDA licences and tapeout.** That means a named owner, a budget tied to chip milestones rather than headcount, and unit metrics such as cost per merged change or per regression fixed. It also means guardrails inside the harness: per-ticket budgets, concurrency slots, batch pricing for work that can wait, and interruptible capacity for regressions. A company that budgets the old way will either underfund the infrastructure or discover the bill after the fact.

## Build, buy, and when

Don't write your own agent loop; it will be the first thing to go stale. Build what outlasts any harness: tool adapters for simulators, FPGA, emulation and silicon; eval suites and reference models; interface contracts; and the policy for who may ask agents to do what. Before RTL freeze, put the log, the interface, intake and the first evals in place. Before tapeout returns, add pod-level models, queued FPGA and emulation, sandboxes and the credential proxy. At bring-up, the boards join as hands and everything that touches hardware gets a kill switch.

## Caveats

This reading is based on published documentation and code; DeepSeek notes that its prototype differs from its internal version, and Anthropic describes a service rather than a recipe. Stable interfaces limit vendor lock-in but don't remove it. The cost model is illustrative, and prices change monthly.

## Closing thought

Part 1 ended on a question: can you avoid the hard part and still succeed? For a chip startup, agent infrastructure is one of those hard parts. It is tempting to postpone it until there is silicon and perhaps more money. But the infrastructure is what makes integration and bring-up fast, and by then it is too late to build it calmly. One design decides which work deserves a person's attention; the other makes sure the work runs safely when no one is watching. The budget is what makes both real.
