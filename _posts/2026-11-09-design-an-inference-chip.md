---
layout: post
title: "Your turn: design an inference chip, then meet the real ones"
date: 2026-11-09 09:00:00 +0800
permalink: /2026/11/design-an-inference-chip/
lang: en
description: "A small game: pick a design scenario, choose six mechanisms, and see who pays and which real chip your design resembles. Eight real designs are hidden in the grid, each with a design card from public sources."
series: "The shape of inference chips (2/2)"
---

{% include lang-switch.html en="/2026/11/design-an-inference-chip/" zh="/zh/2026/11/design-an-inference-chip/" %}

*Part 2 of 2. [Part 1](/2026/11/inference-chip-shapes/) scored 43 inference chips on ten axes and asked what their designers thought was scarce.*

<link rel="stylesheet" href="/assets/chip-radar/game.css">

Monday morning, back in forward mode. [Last time](/2026/11/inference-chip-shapes/) I read 43 inference chips backwards: take the shipped design, guess what its team thought was scarce. This time you hold the pen. Pick one of six design scenarios, make six decisions, and see which real teams already made the same bets. The game tells you when you hit one.

**How to play.** Pick a design scenario, then one option in each of the six rows. The panel on the right updates as you click: your chip's shape on the ten axes from the last post, the nearest of the 43 real chips as a dashed outline, who pays (hardware, compiler or the serving system) against the scenario's budget, and whether the design passes the scenario's three checks. It is a toy model: the point is the trade-offs, not a score. **One more thing: eight real designs are hidden in the grid.** Match a real team's combination of buttons and you hit the jackpot. You don't need to: building your own chip is the point, and a hit is just a bonus.

<div id="chip-game"></div>

Three things usually happen on the first try.

1. **You go over budget.** Pick the strongest option in every row and the bill lands everywhere at once. That is the committee chip from the last post: every axis at 5, nobody willing to pay.
2. **Cost moves instead of disappearing.** A fully static schedule makes the hardware cheap and the compiler expensive. P/D disaggregation, prefill on one chip type and decode on another, makes each chip simpler and the serving layer harder. The total rarely drops much; who pays changes.
3. **Different scenarios reward opposite choices.** A model hardwired into silicon aces *Frozen model* and fails *Many models*. A GPU with P/D disaggregation handles *Long context* and fails *On-device*. Six scenarios, six different winners. That is the backward study, run forward: the shapes differ because the scarce thing differs.

## The real bets behind the buttons

Each jackpot in the game is a combination of buttons that a real team actually chose. Pick one below to see the combination, its shape, and the story behind it in five parts: **why** (what was scarce), **what they built**, the obvious alternative that was **not taken**, **who pays** for it, and **what would change our mind**. The last part matters most: a radar score can only be argued with, but a card can be wrong. All eight use public sources only; where the rationale is my inference and not the designers' own words, the card says so.

<div id="chip-cards"></div>
<script src="/assets/chip-radar/data.js"></script>
<script src="/assets/chip-radar/cards.js"></script>
<script src="/assets/chip-radar/game.js"></script>

## Caveats

- The game is a toy. Each mechanism lifts some axes, and the shape takes the highest level any choice reaches. Axis levels, costs and budgets are my simplifications, chosen so that the archetypes land near their real counterparts; they are not measurements.
- The radar scores come from the [previous post](/2026/11/inference-chip-shapes/), with its sources and its known weaknesses.
- No combination is scored as the best one, on purpose. Each card describes one trade-off, not a ranking.

The weekend study gave me a checklist; this post turns it into a game. Back to forward mode.
