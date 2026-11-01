---
layout: post
title: "Building agent infrastructure at a chip startup: lessons from DeepSeek's superagent and Claude Managed Agents"
permalink: /2026/11/agent-infra-chip-startup/
lang: en
series: "Chip software in the AI era (3/3)"
description: "DeepSeek's dsh-superagent prototype and Anthropic's Claude Managed Agents solve different layers of the same problem. A practical reading for a small AI inference chip startup with no legacy and no silicon yet."
---

{% include lang-switch.html en="/2026/11/agent-infra-chip-startup/" zh="/zh/2026/11/agent-infra-chip-startup/" %}

*Part 3 of 3. [Part 2](/2026/10/humans-brain-ai-hands/) argued that the infrastructure engineers and agents work in is as important as the chip and the compiler. This post looks at how to build it, from the angle of a small inference chip startup: no history, no legacy, and no chips until the first tapeout comes back.*

Two recent public designs make a useful pair. DeepSeek published [dsh-superagent](https://github.com/deepseek-ai/dsh-superagent-prototype), a proactive coding agent for a team's repository, built on its open-source agent runtime DeepSeek Harness. Anthropic described the architecture of [Claude Managed Agents](https://www.anthropic.com/research/managed-agents), its hosted service for long-running agents. They look like competitors. They are closer to two layers of the same stack.

## At a glance

<div class="glance" markdown="1">

**DeepSeek's prototype answers "what work should the agent do, for whom, and when should it bother a person?" Managed Agents answers "how does that work run reliably and safely?" A startup needs both layers.**

- **Borrow from DeepSeek:** work items with explicit authorization, an observe-before-acting mode, and a strict budget for human attention.
- **Borrow from Anthropic:** an append-only session log, one interface for every tool and environment, disposable sandboxes, and credentials kept out of reach of generated code.
- **For a pre-silicon startup:** put simulators, FPGA prototypes and reference GPUs behind that one interface now, so when the first silicon returns it is just one more tool for agents and evals that already exist.

</div>

## Two designs, two layers

**DeepSeek's dsh-superagent** is a bundle for DeepSeek Harness that watches one GitHub repository and, optionally, Feishu chats. Its README is candid: a research prototype, not an official product, grown out of the team's daily work with much of the engineering done by coding agents. Its core principle is to **take as little human attention as possible and give as much value as possible**. The domain model makes that concrete:

- A message becomes a **Ticket** only after an evaluation step accepts it under a versioned **Policy**: who may ask, through which channel, and which written rules allow proactive work. The acceptance is recorded as a **Mandate** that states the scope and why the work is allowed.
- Proactive work starts in an **observe** mode that only records what the agent would have done; a team switches to auto after reviewing those decisions.
- Each Ticket gets its own executor session and working directory, typically a git worktree, and replies in the conversation where the request was made.
- Concurrency is limited by worker slots, with one slot kept free so a person's message is never blocked by new work.
- Outgoing actions are stored before they are performed, so a restart resumes cleanly. State lives in a single SQLite file.

The docs are equally candid about isolation: workers run with full access as the operator's OS user, and the account wrappers set defaults rather than a security boundary. The docs recommend a dedicated OS account.

**Claude Managed Agents** is built around three parts that can each fail or be replaced on their own: the **session** (an append-only log of everything that happened), the **harness** (the loop that calls the model and routes tool calls) and the **sandbox** (where code runs). The harness calls any environment through one interface, `execute(name, input) → string`, and can be restarted from the log with `wake(sessionId)`. Containers are treated as cattle, not pets. Git tokens are wired in when a sandbox is set up, and other credentials stay in a vault behind a proxy, so the harness and the generated code never see them. Anthropic reports that time to first token dropped about 60% at the median and over 90% at p95 after this split. It also notes that harness assumptions go stale as models improve, which is why it fixes the interfaces rather than any particular harness.

| | dsh-superagent (DeepSeek) | Claude Managed Agents (Anthropic) |
|---|---|---|
| Layer | Team workflow: intake, authorization, human attention | Runtime: durable sessions, execution, isolation |
| Unit of work | Ticket with a Mandate under a versioned Policy | Session with an append-only event log |
| Triggers | GitHub and Feishu events, explicit requests and written rules | API calls from the developer's application |
| Execution | One session and directory per Ticket on one machine | Stateless harnesses; sandboxes provisioned on demand |
| Isolation | Operator's OS user, full access; dedicated account advised | Sandboxes; credentials in a vault behind a proxy |
| Recovery | Stored work and recovery notes after restart | New harness resumes from the session log |
| Status | MIT-licensed research prototype | Commercial hosted service |

## What a chip startup should take from each

A startup has one advantage here: nothing to migrate. The same choices are much harder to make once each team has built its own habits. Seven practical points:

**1. Adopt the interfaces, not a product.** Write down your own versions of the session log, `execute`, `provision` and `wake` on day one, even if a hosted harness implements them for now. Anthropic's lesson is that harnesses go stale; interfaces last. If you switch models, harnesses or vendors later, your tools, evals and logs survive.

**2. Make the front door explicit.** Copy DeepSeek's intake discipline. Work starts from a request in the channels the team already uses, GitHub plus Feishu or Slack, from people on an allowed list, and becomes a ticket with a recorded scope. Proactive work, such as "fix every nightly regression in the kernel library", starts in observe mode. Give the agent an attention budget: one acknowledgement, silence while working, then a result or one concrete question.

**3. Put the hands in place before the silicon.** Before tapeout, a chip startup still has plenty of hands: the compiler itself, a functional simulator, a cycle-accurate model, reference GPU machines, FPGA prototypes and shared emulation time. Expose each through the same `execute` interface, and give scarce ones such as emulation a queue. A deterministic, compiler-scheduled design adds a bonus: the cycle-accurate model gives agents an exact score to optimize against.

**4. Design for the day silicon returns.** Bring-up is when time matters most. If agents, evals and logs already run against simulators through one interface, a bring-up board is just one more hand. The same regression suites run on day one, and the gap between "model says" and "silicon says" becomes a diff, not an investigation.

**5. Isolate from the first day, not after an incident.** The superagent prototype's full-access model is fine for a research tool. It is not fine next to chip RTL, foundry data under NDA, tool licences or customer models. Use one disposable sandbox or VM per ticket, a proxy that injects credentials, an egress allowlist, and a clear rule about which data agents may ever see. Check which models and hosting regions your company can use before choosing a hosted option. Anthropic has said Managed Agents can also use sandboxes on a customer's own infrastructure.

**6. Treat the session log as the integration memory.** For a pod-scale product, the most valuable record is how a failure crossed component boundaries. One log across compiler, runtime, driver and serving agents lets a person or another agent pick up where the last one stopped, and turns integration bugs into tickets with evidence attached.

**7. Plan capacity and ownership.** Compiling and simulating are CPU-heavy, emulation and tool licences are finite, and model tokens cost money. Budget them like test equipment. Copy the reserved slot for humans, so people are never queued behind agents. And give the infrastructure an owner: one or two engineers who run it as a product, from the start.

![A starting architecture for a chip startup's agent infrastructure](/assets/agent-infra/startup-stack-en.svg)

## Build or buy

Don't write your own agent loop; it will be the first thing to go stale. Use a hosted or open-source harness where your policies allow it. Build what is specific to you and what will outlast any harness: the tool adapters for simulators, FPGA, emulation and later silicon; the eval suites and reference models; the interface contracts between components; and the policy that says who may ask the agent for what.

## A phased plan tied to the chip schedule

- **Before RTL freeze:** shared repository conventions and CI, the session log and `execute` interface, intake with observe mode, compiler and simulator as the first hands, the first eval suites.
- **Before tapeout returns:** pod-level system models, FPGA and emulation behind a queue, cross-component tickets and interface contracts, sandboxes and the credential proxy in place.
- **First silicon back:** bring-up boards as hands, the same regressions on real hardware, tighter access control around the lab, a kill switch for anything that touches hardware.

## Caveats

- This reading is based on the published documentation and code. DeepSeek's prototype explicitly differs from its internal version, and Anthropic's post describes a service, not a recipe.
- Hosted services trade control for speed; stable interfaces limit lock-in but don't remove it.
- None of this replaces engineering judgment about what agents should not touch.

## Closing thought

For a chip startup, the first silicon is the deadline everything is planned around. The agent infrastructure deserves the same planning: by the time the first chips come back, the agents, evals and logs that will bring them up should already be running. Taken together, the two designs show what that looks like: one decides what work deserves a person's attention, the other makes sure the work runs safely when nobody is watching.
