---
layout: post
title: "Agenten-Infrastruktur in einem Chip-Startup aufbauen: Lehren aus DeepSeeks Superagent und Claude Managed Agents"
permalink: /de/2026/11/agent-infra-chip-startup/
lang: de
series: "Chip-Software im KI-Zeitalter (3/3)"
description: "DeepSeeks Prototyp dsh-superagent und Anthropics Claude Managed Agents adressieren verschiedene Schichten desselben Problems. Eine praktische Lesart für ein kleines Startup für KI-Inferenzchips ohne Altlasten und noch ohne Silizium, einschließlich der Kosten."
---

{% include lang-switch.html en="/2026/11/agent-infra-chip-startup/" zh="/zh/2026/11/agent-infra-chip-startup/" de="/de/2026/11/agent-infra-chip-startup/" %}

*Teil 3 von 3. In [Teil 1](/de/2026/11/you-cant-avoid-the-hard-part/) ging es um die Entscheidung für den schweren Weg. [Teil 2](/de/2026/10/humans-brain-ai-hands/) argumentierte, dass die Infrastruktur, in der Menschen und Agenten arbeiten, dieselbe Priorität verdient wie Chip und Compiler. Dieser Beitrag fragt, wie ein kleines Inferenzchip-Startup diese Infrastruktur aufbauen kann und was sie kostet, wenn es keine Altlasten und bis zum Rücklauf des ersten Tapeouts kein Silizium hat.*

Zwei aktuelle öffentliche Designs ergeben ein aufschlussreiches Paar. DeepSeek hat [dsh-superagent](https://github.com/deepseek-ai/dsh-superagent-prototype) veröffentlicht, einen proaktiven Coding-Agenten für das Repository eines Teams, aufgebaut auf der quelloffenen Agenten-Runtime DeepSeek Harness. Anthropic hat die Architektur von [Claude Managed Agents](https://www.anthropic.com/research/managed-agents) beschrieben, seinem gehosteten Dienst für lang laufende Agenten. Man kann beide leicht als Konkurrenten lesen. Treffender ist es, sie als zwei Schichten desselben Stacks zu verstehen.

## Auf einen Blick

<div class="glance" markdown="1">

**DeepSeeks Prototyp beantwortet, welche Arbeit ein Agent übernehmen soll, für wen, und wann er einen Menschen einbeziehen soll. Managed Agents beantwortet, wie diese Arbeit zuverlässig und sicher läuft. Ein Startup braucht beide Schichten.**

- **Von DeepSeek:** Arbeitsaufträge mit expliziter Autorisierung, ein Beobachtungsmodus vor dem Handeln und ein striktes Budget für menschliche Aufmerksamkeit.
- **Von Anthropic:** ein Append-only-Session-Log, eine Schnittstelle für jede Umgebung, wegwerfbare Sandboxes und Zugangsdaten, die generierter Code nie zu sehen bekommt.
- **Für ein Startup vor dem ersten Silizium:** Simulatoren, FPGA-Prototypen und Referenz-GPUs schon jetzt hinter diese Schnittstelle stellen und die Infrastruktur als eigenständigen Budgetposten planen: grob 1–2 Millionen US-Dollar pro Jahr für ein Software-Team von 30 Personen.

</div>

## Zwei Designs, zwei Schichten

**dsh-superagent** überwacht ein GitHub-Repository und optional Feishu-Chats. Die README bezeichnet ihn als Forschungsprototyp und nicht als Produkt; sein Leitprinzip lautet, *so wenig menschliche Aufmerksamkeit wie möglich zu beanspruchen und so viel Wert wie möglich zu liefern*. Eine Nachricht wird erst dann zum *Ticket*, wenn ein Bewertungsschritt sie nach einer versionierten *Policy* annimmt: wer anfragen darf, über welchen Kanal, und welche schriftlichen Regeln dem Agenten eigenständiges Handeln erlauben. Proaktive Arbeit beginnt in einem *Beobachtungsmodus*, der nur festhält, was der Agent getan hätte. Jedes Ticket erhält eine eigene Session und einen eigenen Git-Worktree, die Nebenläufigkeit ist durch Worker-Slots begrenzt, von denen einer stets für Menschen reserviert bleibt, und anstehende Aktionen werden vor ihrer Ausführung gespeichert, sodass ein Neustart sauber fortsetzt. Ebenso offen ist die Dokumentation zur Isolation: Worker laufen mit vollen Rechten als Betriebssystemnutzer des Betreibers, empfohlen wird ein eigenes Konto.

**Claude Managed Agents** trennt drei Komponenten, die unabhängig voneinander ausfallen oder ersetzt werden können: die *Session*, ein Append-only-Log aller Ereignisse; das *Harness*, die Schleife, die das Modell aufruft und Tool-Aufrufe weiterleitet; und die *Sandbox*, in der Code läuft. Das Harness erreicht jede Umgebung über eine einzige Schnittstelle, `execute(name, input) → string`, und ein abgestürztes Harness startet mit `wake(sessionId)` aus dem Log neu. Zugangsdaten liegen in einem Vault hinter einem Proxy, sodass weder das Harness noch generierter Code sie je in der Hand hat. Laut Anthropic sank die Time to First Token nach dieser Trennung im Median um etwa 60 % und beim p95 um mehr als 90 %. Es ist das umgebaute System, dessen erste Ein-Container-Version Teil 1 beschrieben hat.

| | dsh-superagent (DeepSeek) | Claude Managed Agents (Anthropic) |
|---|---|---|
| Schicht | Team-Workflow: Eingang, Autorisierung, Aufmerksamkeit | Runtime: Sessions, Ausführung, Isolation |
| Arbeitseinheit | Ticket mit Mandat unter versionierter Policy | Session mit Append-only-Event-Log |
| Ausführung | Eine Session und ein Worktree pro Ticket, eine Maschine | Zustandslose Harnesses; Sandboxes bei Bedarf |
| Isolation | Betriebssystemnutzer des Betreibers, volle Rechte | Sandboxes; Zugangsdaten hinter einem Proxy |
| Status | Forschungsprototyp unter MIT-Lizenz | Kommerzieller gehosteter Dienst |

## Was ein Chip-Startup von beiden übernehmen sollte

Ein Startup hat einen strukturellen Vorteil: Es muss nichts migrieren. Diese Entscheidungen werden deutlich schwieriger, sobald sich Teams in den isolierten Gewohnheiten eingerichtet haben, vor denen Teil 2 gewarnt hat.

**Schnittstellen übernehmen, kein Produkt.** Session-Log, `execute`, `provision` und `wake` vom ersten Tag an selbst definieren, auch wenn vorerst ein gehostetes Harness sie implementiert. Harnesses veralten; Schnittstellen bleiben, und mit ihnen die Werkzeuge, Evals und Logs, die darauf aufbauen.

**Den Eingang explizit machen.** Arbeit beginnt mit einer Anfrage in Kanälen, die das Team ohnehin nutzt, von Personen auf einer Freigabeliste, und wird zu einem Ticket mit festgehaltenem Umfang. Proaktive Arbeit startet im Beobachtungsmodus. Der Agent bestätigt einmal, arbeitet still und meldet sich dann mit einem Ergebnis oder genau einer konkreten Frage.

**Die Hände vor dem Silizium zusammenstellen.** Vor dem Tapeout verfügt ein Startup bereits über den Compiler, einen funktionalen Simulator, ein zyklengenaues Modell, Referenz-GPUs, FPGA-Prototypen und geteilte Emulationszeit. Jede dieser Umgebungen gehört hinter dieselbe Schnittstelle, die knappen mit einer Warteschlange. Kommt das Silizium zurück, ist ein Bring-up-Board einfach eine weitere Hand: Dieselben Regressionen laufen ab dem ersten Tag, und die Abweichung zwischen Modell und Silizium wird zu einem Diff statt zu einer Untersuchung.

**Vom ersten Tag an isolieren.** Volle Rechte sind für ein Forschungswerkzeug vertretbar, nicht aber neben RTL, Foundry-Daten unter NDA oder Kundenmodellen. Die Grundausstattung: eine wegwerfbare Sandbox pro Ticket, ein Credential-Proxy, eine Egress-Allowlist und eine ausdrückliche Regel, welche Daten Agenten überhaupt sehen dürfen. Zu prüfen ist außerdem, welche Modelle und Hosting-Regionen das Unternehmen nutzen darf; laut Anthropic kann Managed Agents auch Sandboxes auf der eigenen Infrastruktur eines Kunden verwenden.

**Das Session-Log als Gedächtnis der Integration behandeln und ihm einen Verantwortlichen geben.** Ein gemeinsames Log für die Agenten von Compiler, Runtime, Treiber und Serving macht aus Fehlern auf Pod-Ebene Tickets mit beigefügter Evidenz. Ein oder zwei Ingenieure sollten die Plattform von Anfang an als Produkt betreiben.

![Eine Startarchitektur für die Agenten-Infrastruktur eines Chip-Startups](/assets/agent-infra/startup-stack-de.svg)

## Was es kostet

Nichts davon ist umsonst, und die Kosten sehen anders aus als alles in einem klassischen Chip-Budget. Betrachten wir ein Software-Team von 30 Ingenieuren vor dem ersten Silizium, das interaktive Coding-Agenten und eine bescheidene Flotte von Hintergrund-Agenten nutzt, bewertet zu Listenpreisen vom Oktober 2026. Die Zahlen geben eine Größenordnung an, kein Angebot.

| Posten | Annahme | Pro Monat |
|---|---|---|
| Interaktive Coding-Agenten | 30 Ingenieure zu je 250–1.000 $ | 7,5k–30k $ |
| Hintergrund-Agenten | 20 Agenten, 22 Tage, 30–100 $ pro Agent und Tag | 13k–44k $ |
| CPU für Sandboxes, Builds und Simulation | 40 Sandboxes mit je 32 vCPUs rund um die Uhr, 0,02–0,045 $ pro vCPU-Stunde | 18k–41k $ |
| Referenz-GPUs | Zwei H100-Knoten mit je 8 GPUs zu 3–4 $ pro GPU-Stunde | 35k–46k $ |
| Speicher, Logs, Netzwerk | Etwa 10 % des Obigen | 7k–16k $ |
| **Summe** | | **etwa 80k–180k $** |

Das sind grob 1–2 Millionen US-Dollar pro Jahr oder 2.700–5.900 US-Dollar pro Ingenieur und Monat. Anthropics Angaben zufolge liegt die durchschnittliche Nutzung von Claude Code in Unternehmen bei [150–250 US-Dollar pro Entwickler und Monat](https://www.morphllm.com/claude-code-api-cost); intensive API-Nutzer berichten von [500–2.000 US-Dollar](https://www.cloudzero.com/blog/codex-vs-claude-code/). Eine H100 auf Abruf kostete Anfang Oktober im [Median etwa 4,20 US-Dollar pro GPU-Stunde](https://uvik.net/blog/gpu-price-index/), und die Mietpreise stiegen im Lauf des Jahres 2026. Nicht enthalten sind FPGA- und Emulationssysteme, die nur auf Angebot verkauft werden und oft der größte Einzelposten sind, EDA-Lizenzen sowie die Ingenieure, die die Plattform betreiben.

Entscheidender als die Summe ist die Struktur der Ausgaben. Ein klassisches Chip-Unternehmen plant sein Budget um Personal, EDA-Lizenzen, IP, Masken und Labor herum und behandelt Rechenleistung als IT-Gemeinkosten, unter der Annahme, dass der Output mit der Zahl der Ingenieure wächst. Mit Agenten wächst der Output zunehmend mit Rechenleistung und Tokens. Die Rechnung folgt der Arbeit statt der Teamgröße, schnellt bei Integration und Bring-up nach oben, und ein einziger außer Kontrolle geratener Job kann über Nacht Tausende Dollar kosten.

**KI-Infrastruktur muss deshalb ein eigenständiger Posten im Plan eines KI-Chip-Unternehmens sein, gleichrangig mit EDA-Lizenzen und Tapeout.** Das bedeutet einen benannten Verantwortlichen, ein Budget, das an Chip-Meilensteinen statt am Personalbestand ausgerichtet ist, und Kennzahlen wie Kosten pro gemergter Änderung oder pro behobener Regression. Es bedeutet auch Leitplanken im Harness selbst: Budgets pro Ticket, Nebenläufigkeits-Slots, Batch-Preise für Arbeit, die warten kann, und unterbrechbare Kapazität für Regressionsläufe. Wer nach alter Methode budgetiert, wird die Infrastruktur entweder unterfinanzieren oder die Rechnung erst im Nachhinein entdecken.

## Bauen, kaufen, und wann

Keine eigene Agenten-Schleife schreiben; sie wäre das Erste, was veraltet. Selbst bauen sollte man, was jedes Harness überdauert: Tool-Adapter für Simulatoren, FPGA, Emulation und Silizium; Eval-Suiten und Referenzmodelle; Schnittstellenverträge; und die Policy, wer Agenten womit beauftragen darf. Vor dem RTL-Freeze gehören Log, Schnittstelle, Eingang und erste Evals an ihren Platz. Bevor das Tapeout zurückkommt, folgen Modelle auf Pod-Ebene, FPGA und Emulation mit Warteschlange, Sandboxes und der Credential-Proxy. Beim Bring-up kommen die Boards als Hände hinzu, und alles, was Hardware berührt, erhält einen Not-Aus.

## Einschränkungen

Diese Lesart beruht auf veröffentlichter Dokumentation und veröffentlichtem Code; DeepSeek weist darauf hin, dass sich der Prototyp von der internen Version unterscheidet, und Anthropic beschreibt einen Dienst, kein Rezept. Stabile Schnittstellen begrenzen die Abhängigkeit von Anbietern, beseitigen sie aber nicht. Das Kostenmodell ist illustrativ, und die Preise ändern sich monatlich.

## Schlussgedanke

Teil 1 endete mit einer Frage: Kann man den schweren Teil umgehen und trotzdem Erfolg haben? Für ein Chip-Startup ist die Agenten-Infrastruktur einer dieser schweren Teile. Es ist verlockend, sie aufzuschieben, bis Silizium da ist und vielleicht mehr Geld. Doch gerade diese Infrastruktur macht Integration und Bring-up schnell, und dann ist es zu spät, sie in Ruhe aufzubauen. Das eine Design entscheidet, welche Arbeit die Aufmerksamkeit eines Menschen verdient; das andere sorgt dafür, dass die Arbeit sicher läuft, wenn niemand hinsieht. Das Budget macht beides erst real.
