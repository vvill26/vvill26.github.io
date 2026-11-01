---
layout: post
title: "You can't avoid the hard part: a preamble on big swings in the AI era"
permalink: /2026/11/you-cant-avoid-the-hard-part/
lang: en
series: "Chip software in the AI era (1/3)"
description: "When a project's hard part can't be avoided, the safe incremental path only delays failure. AI is changing which hard parts are affordable to take on."
---

{% include lang-switch.html en="/2026/11/you-cant-avoid-the-hard-part/" zh="/zh/2026/11/you-cant-avoid-the-hard-part/" %}

*Part 1 of 3 in a short series on how AI changes the way chip software is built.*

Most engineering teams have been here. A project has an obvious hard part, and the plan of record quietly routes around it: add a layer, keep the old system alive, sync the two, migrate piece by piece. Every step feels responsible. The hard part is still there at the end.

Katelyn Lesse, who leads platform engineering at Anthropic, wrote about this pattern in July in ["You can't avoid the hard part"](https://www.katelynlesse.com/blog/you-cant-avoid-the-hard-part). She proposes one question: **can we avoid the hard part and still succeed?** If the honest answer is no, the safe path doesn't remove the risk. It only postpones the failure. A second test helps decide whether to take the big swing: assume the risky move works, then check whether the rest of the plan holds up. If it does, take it.

She gives two examples. At Stripe, a new unified account model needed nearly all of the company's business logic to understand it. The plan of record was to sync old and new models in both directions, and it would have been brittle and wouldn't scale. The team instead replaced every read and write call site with a single interface, work long dismissed as too expensive, using centralized codemods. It took multiple engineering years, and she believes the new accounts couldn't have shipped without it. At Anthropic, the first version of Claude Managed Agents ran everything in one container. It was slow to start, fragile, and kept credentials next to generated code. Close to launch, the team delayed and rebuilt it as a real distributed system.

She is also clear about what a big swing needs: a few people who are energized by the problem and given real ownership, and a leader who accepts the risk and shields the team if it fails.

Her closing point is the reason for this series. AI is changing which problems are hard. A multi-year codemod or a full rewrite in an unfamiliar language may now be affordable. But AI also leaves teams with the parts that are genuinely hard. For an AI chip company, the next two posts look at what that means: which rewrites are now within reach, and what has to be true before you attempt them.
