---
layout: post
title: "Am schweren Teil führt kein Weg vorbei"
permalink: /de/2026/11/you-cant-avoid-the-hard-part/
lang: de
series: "Chip-Software im KI-Zeitalter (1/3)"
description: "Zwei Momente, in denen eine Engineering-Leiterin zwischen dem sicheren und dem schweren Weg wählen musste, und warum KI verändert, welche schweren Aufgaben sich ein Team leisten kann."
---

{% include lang-switch.html en="/2026/11/you-cant-avoid-the-hard-part/" zh="/zh/2026/11/you-cant-avoid-the-hard-part/" de="/de/2026/11/you-cant-avoid-the-hard-part/" %}

*Teil 1 von 3 einer kurzen Reihe darüber, wie KI die Entwicklung von Chip-Software verändert.*

Man stelle sich eine kleine Gruppe von Ingenieurinnen und Ingenieuren bei einem Offsite vor. Das Projekt, das vor ihnen liegt, ist schon einmal ins Stocken geraten. Stripe möchte, dass ein Nutzer über alle Produkte hinweg genau ein Konto hat: Dasselbe Unternehmen zahlt vielleicht ein Abonnement, nimmt Kartenzahlungen an und erhält Auszahlungen, alles über ein gemeinsames Guthaben. Das bestehende Datenmodell kann das nicht abbilden. Kunden, Händler und Zahlungsempfänger leben in getrennten Objekten, und nahezu jede Zahlungs- und Abrechnungs-API im Unternehmen ist gegen genau diese Objekte geschrieben.

Katelyn Lesse, heute Leiterin des Platform Engineering bei Anthropic, arbeitete damals an Stripe Connect. Sie erzählt die Geschichte in ihrem Beitrag vom Juli, ["You can't avoid the hard part"](https://www.katelynlesse.com/blog/you-cant-avoid-the-hard-part).

Der offizielle Plan war der verantwortungsvolle: das neue Kontomodell neben den alten aufbauen und beide in beide Richtungen synchron halten, damit bestehender Code unverändert bleiben kann. Auf der Folie sah das sicher aus. In der Praxis hätte ein Unternehmen, das zugleich Händler und Kunde ist, drei Modelle mit Kopien desselben Namens und derselben E-Mail-Adresse gebraucht, die dauerhaft konsistent bleiben müssen. Die Synchronisierung wäre fragil gewesen und hätte nicht skaliert.

Die Gruppe kam immer wieder auf eine Idee zurück, die bereits einmal verworfen worden war. Nennen wir sie Kapselung: eine einzige Schnittstelle vor jedem Lese- und Schreibzugriff in der Codebasis, sodass sämtlicher Code nur noch mit dem neuen Modell spricht. Verworfen worden war sie, weil der Aufwand in Ingenieursjahren geschätzt wurde. Also versuchten sie einen anderen Test: Angenommen, der unmögliche Teil gelingt. Trägt dann der Rest des Plans? Er trug. Die Entscheidung folgte: Einige Ingenieure, die das Problem begeisterte, übernahmen die Verantwortung, die Arbeit blieb zentral gebündelt und wurde mit Codemods vorangetrieben, und Lesse akzeptierte, dass sie zum längsten Pfad des gesamten Programms werden könnte. Am Ende waren es mehrere Ingenieursjahre und etliche Rückschläge. Ohne diesen Schritt, ist sie überzeugt, wären die neuen Konten nie ausgeliefert worden.

Der zweite Moment kam Jahre später, bei Anthropic. Ihr Team hatte die erste Version von Claude Managed Agents auf die einfache Art gebaut: Jede Session startete einen Container mit Claude Code, und alles lebte in diesem einen Container. Frühe Kunden erlebten langsame Starts, Sessions, die mit ihrem Container starben, und generierten Code, der direkt neben Zugangsdaten lief. Das Team behob jedes Symptom einzeln und verbrachte lange Phasen mit dem Debuggen von Sessions, die irgendwo zwischen Harness, Event-Stream und Container hängen geblieben waren. Schließlich erkannte es eine einzige Ursache: das Ein-Container-Design selbst. Die Lösung war ein echtes verteiltes System, und die öffentliche Beta stand kurz bevor. Das Team stellte dieselbe Frage, ob ein Start auf dem alten Design trotzdem gelingen könnte, beantwortete sie mit Nein und verschob den Launch, um neu zu bauen.

Lesses Fazit ist unmissverständlich: Wenn der schwere Teil unvermeidbar ist, gilt "the safe path is just delaying failure", der sichere Weg verzögert nur das Scheitern.

Ihr Schlussgedanke ist der Ausgangspunkt dieser Reihe. KI verändert, welche Probleme als schwer gelten. Ein mehrjähriger Codemod oder eine komplette Neuentwicklung in einer ungewohnten Sprache rücken womöglich in Reichweite. [Teil 2](/de/2026/10/humans-brain-ai-hands/) betrachtet genau eine solche Neuentwicklung und was sie für Compiler und Tooling in einem KI-Chip-Unternehmen bedeutet. [Teil 3](/de/2026/11/agent-infra-chip-startup/) fragt, was ein kleines Chip-Startup aufbauen und bezahlen muss, um so zu arbeiten.
