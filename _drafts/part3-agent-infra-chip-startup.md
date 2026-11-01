---
layout: post
title: "Building agent infrastructure at a chip startup: lessons from DeepSeek's superagent and Claude Managed Agents"
permalink: /2026/11/agent-infra-chip-startup/
lang: en
series: "Chip software in the AI era (3/3)"
description: "DeepSeek's dsh-superagent prototype and Anthropic's Claude Managed Agents address different layers of the same problem. A practical reading for a small AI inference chip startup with no legacy and no silicon yet, including what the infrastructure costs."
---

{% include lang-switch.html en="/2026/11/agent-infra-chip-startup/" zh="/zh/2026/11/agent-infra-chip-startup/" %}

*Part 3 of 3. [Part 1](/2026/11/you-cant-avoid-the-hard-part/) was about choosing the hard path. [Part 2](/2026/10/humans-brain-ai-hands/) argued that the infrastructure people and agents work in deserves the same priority as the chip and the compiler. This post asks how a small inference chip startup can build that infrastructure, and what it costs, when it has no history, no legacy and no silicon until the first tapeout comes back.*

Two recent public designs make a useful pair. DeepSeek published [dsh-superagent](https://github.com/deepseek-ai/dsh-superagent-prototype), a proactive coding agent for a team's repository, built on its open-source agent runtime, DeepSeek Harness. Anthropic described the architecture of [Claude Managed Agents](https://www.anthropic.com/research/managed-agents), its hosted service for long-running agents. They are easy to read as competitors. They are better read as two layers of the same stack.

## At a glance

<div class="glance" markdown="1">

**DeepSeek's prototype addresses what work an agent should take on, for whom, and when it should involve a person. Managed Agents addresses how that work runs reliably and safely. A startup needs both layers.**

- **From DeepSeek:** work items with explicit authorization, an observe-before-acting mode, and a strict budget for human attention.
- **From Anthropic:** an append-only session log, one interface for every tool and environment, disposable sandboxes, and credentials kept out of reach of generated code.
- **For a pre-silicon startup:** put simulators, FPGA prototypes and reference GPUs behind that interface now, and budget the infrastructure as a first-class line. For a 30-person software team, a reasonable estimate is $1–2 million a year before emulation and licences.

</div>

## Two designs, two layers

DeepSeek's dsh-superagent is a bundle for DeepSeek Harness that watches one GitHub repository and, optionally, Feishu chats. The README is candid about what it is: a research prototype rather than an official product, grown out of the team's daily work, with much of the engineering done by coding agents. Its organizing principle is to *take as little human attention as possible and give as much value as possible*, and the domain model is built around that principle.

A message becomes a *ticket* only after an evaluation step accepts it under a versioned *policy*, which defines who may ask, through which channel, and which written rules allow the agent to act on its own initiative. The acceptance is recorded as a *mandate* that states the scope of the work and why it is allowed. Proactive work starts in an *observe* mode that only records what the agent would have done; a team moves to automatic mode after reviewing those records. Each ticket runs in its own session and working directory, typically a git worktree, and replies in the conversation where the request was made. Concurrency is limited by worker slots, with one slot always reserved so that a person's message is never queued behind new work. Outgoing actions are stored before they are performed, so a restart resumes cleanly, and all state lives in a single SQLite file.

The documentation is equally candid about isolation. Workers run with full access as the operator's operating-system user, and the account wrappers set defaults rather than a security boundary. The docs recommend a dedicated OS account.

Claude Managed Agents is built around three components that can each fail or be replaced independently. The *session* is an append-only log of everything that happened. The *harness* is the loop that calls the model and routes its tool calls. The *sandbox* is where code runs. The harness reaches any environment through one interface, `execute(name, input) → string`, and a crashed harness is restarted from the log with `wake(sessionId)`. Containers are treated as cattle rather than pets. Git tokens are wired in when a sandbox is provisioned, and other credentials stay in a vault behind a proxy, so neither the harness nor the generated code ever holds them. Anthropic reports that after this decoupling, median time to first token fell by about 60% and p95 by more than 90%. It also observes that assumptions built into a harness go stale as models improve, which is why it fixed the interfaces rather than any particular harness. This is the rebuilt system whose single-container first version Part 1 described.

| | dsh-superagent (DeepSeek) | Claude Managed Agents (Anthropic) |
|---|---|---|
| Layer | Team workflow: intake, authorization, human attention | Runtime: durable sessions, execution, isolation |
| Unit of work | Ticket with a mandate under a versioned policy | Session with an append-only event log |
| Triggers | GitHub and Feishu events; explicit requests and written rules | API calls from the developer's application |
| Execution | One session and directory per ticket, on one machine | Stateless harnesses; sandboxes provisioned on demand |
| Isolation | Operator's OS user, full access; dedicated account advised | Sandboxes; credentials in a vault behind a proxy |
| Recovery | Stored work and recovery notes after a restart | A new harness resumes from the session log |
| Status | MIT-licensed research prototype | Commercial hosted service |

## What a chip startup should take from each

A startup has one structural advantage here: there is nothing to migrate. The choices below are much harder to make once each team has settled into its own tools and habits, which is the siloed state Part 2 warned about.

**Adopt the interfaces, not a product.** Define your own session log, `execute`, `provision` and `wake` on the first day, even if a hosted harness implements them for now. Anthropic's experience is that harnesses go stale while interfaces last. If the company later changes models, harnesses or vendors, its tools, evals and logs survive the change.

**Make the front door explicit.** DeepSeek's intake discipline transfers directly. Work starts from a request in channels the team already uses, such as GitHub and Feishu or Slack, from people on an allowed list, and becomes a ticket with a recorded scope. Proactive work, such as fixing every nightly regression in the kernel library, starts in observe mode. The agent also gets an attention budget: one acknowledgement, silence while working, then a result or a single concrete question.

**Assemble the hands before the silicon.** Before tapeout, a chip startup already has many environments an agent can act in: the compiler itself, a functional simulator, a cycle-accurate model, reference GPU machines, FPGA prototypes and shared emulation time. Each should sit behind the same `execute` interface, and the scarce ones, emulation above all, need a queue. A deterministic, compiler-scheduled design adds a further benefit: the cycle-accurate model gives agents an exact objective to optimize against, as Part 2 described.

**Design for the day silicon returns.** Bring-up is when time matters most. If agents, evals and logs already run against simulators through one interface, a bring-up board is simply one more hand. The same regression suites run on the first day, and the gap between what the model predicts and what the silicon does becomes a diff rather than an investigation.

**Isolate from the first day, not after the first incident.** The prototype's full-access model is reasonable for a research tool. It is not reasonable next to RTL, foundry data under NDA, tool licences or customer models. The baseline is one disposable sandbox or VM per ticket, a proxy that injects credentials, an egress allowlist, and an explicit rule about which data agents may ever see. Before choosing a hosted option, confirm which models and hosting regions the company can use; Anthropic has said Managed Agents can also use sandboxes on a customer's own infrastructure.

**Treat the session log as the integration memory.** For a pod-scale product, the most valuable record is how a failure crossed component boundaries. One log across the compiler, runtime, driver and serving agents lets a person or another agent continue where the last one stopped, and turns integration defects into tickets with evidence attached.

**Assign an owner.** One or two engineers should run the infrastructure as a product from the start, with the same standing as the compiler or runtime leads.

![A starting architecture for a chip startup's agent infrastructure](/assets/agent-infra/startup-stack-en.svg)

## What it costs

None of this is free, and the costs look different from anything in a traditional chip budget. To make them concrete, consider a software team of 30 engineers in the pre-silicon phase, working with interactive coding agents and running a modest fleet of background agents. The figures below use public list prices from October 2026 and are meant as an order of magnitude, not a quote.

| Item | Assumption | Per month |
|---|---|---|
| Interactive coding agents | 30 engineers at $250–$1,000 each | $7.5k–$30k |
| Background agents | 20 agents, 22 working days, $30–$100 per agent-day | $13k–$44k |
| CPU for sandboxes, builds and simulation | 40 sandboxes of 32 vCPUs running continuously, about 920k vCPU-hours at $0.02–$0.045 | $18k–$41k |
| Reference GPUs | Two 8-GPU H100 nodes, about 11.5k GPU-hours at $3–$4 | $35k–$46k |
| Storage, logs and networking | About 10% of the above | $7k–$16k |
| **Total** | | **about $80k–$180k** |

That is roughly $1–2 million a year, or $2,700–$5,900 per engineer per month. The inputs come from public figures. Anthropic's published guidance for Claude Code puts the average enterprise cost at [$150–$250 per developer per month](https://www.morphllm.com/claude-code-api-cost), while heavy API users at large companies have reported [$500–$2,000](https://www.cloudzero.com/blog/codex-vs-claude-code/). An H100 rented on demand had a [median price of about $4.20 per GPU-hour](https://uvik.net/blog/gpu-price-index/) across providers in early October, with specialist clouds lower and rental prices rising through 2026. Compute-optimized cloud CPUs list at about $0.045 per vCPU-hour on demand, and roughly half that with multi-year commitments.

Three things are not in the table. FPGA prototyping and emulation systems are sold on quotation rather than list price, and they are often the largest single item. EDA licences follow their own contracts. And the one or two engineers who own the platform are a headcount cost, not a cloud bill.

The point is less the exact total than the shape of the spending. A traditional chip company budgets around headcount, EDA licences, IP, masks and the lab, and treats compute as IT overhead. That model assumes engineering output grows with the number of engineers. With agents, output increasingly grows with compute and tokens, and the bill grows with the work being done, not with the size of the team. It is variable, it spikes at integration and bring-up, and a single runaway job can cost thousands of dollars overnight.

**AI infrastructure therefore has to be a first-class line in an AI chip company's plan, with the same standing as EDA licences and tapeout.** In practice that means a named owner, a budget tied to chip milestones rather than to headcount, and unit metrics that connect spending to results: cost per merged change, per regression fixed, per simulation-hour. It also means guardrails built into the harness: per-agent and per-ticket budgets, concurrency slots in the style of DeepSeek's design, batch pricing for work that can wait, high prompt-cache hit rates, and interruptible capacity for regression runs. A company that budgets the old way will either underfund the infrastructure and lose the productivity it was meant to deliver, or discover the bill after the fact.

## Build or buy

Don't write your own agent loop; it will be the first component to go stale. Use a hosted or open-source harness where company policy allows it. Build what is specific to the company and will outlast any harness: the tool adapters for simulators, FPGA, emulation and later silicon; the eval suites and reference models; the interface contracts between components; and the policy that defines who may ask an agent to do what.

## A plan tied to the chip schedule

Before RTL freeze, the priorities are shared repository conventions and CI, the session log and `execute` interface, intake with observe mode, the compiler and simulators as the first hands, and the first eval suites. Before the first tapeout returns, they are pod-level system models, FPGA and emulation behind a queue, cross-component tickets and interface contracts, and sandboxes with a credential proxy. When first silicon arrives, bring-up boards become hands, the same regressions run on real hardware, access to the lab tightens, and anything that touches hardware gets a kill switch.

## Caveats

This reading is based on published documentation and code. DeepSeek states that its prototype differs from its internal version, and Anthropic's post describes a service, not a recipe. Hosted services trade control for speed; stable interfaces limit lock-in but don't remove it. The cost model is illustrative, and prices change month to month. None of it replaces engineering judgment about what agents should never touch.

## Closing thought

Part 1 ended on a question: can you avoid the hard part and still succeed? For a chip startup, the agent infrastructure is one of those hard parts. It is tempting to postpone it until after tapeout, when there is silicon to work with and perhaps more money. But the infrastructure is what makes integration and bring-up fast, and by then it is too late to build it calmly. Taken together, the two designs show what to build: one decides which work deserves a person's attention, and the other makes sure that work runs safely when no one is watching. The budget section shows what it takes to pay for it.
