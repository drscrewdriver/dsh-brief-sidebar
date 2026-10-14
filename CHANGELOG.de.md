# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

## 0.9.10 — 2026-10-14 (Kapazitäten nach Messung angehoben, alte Sitzungen werden neu gefaltet)

- Neue Obergrenzen der Suchfaltung: Quellen 20→**64**, Anfragen 20→**48**, URLs der laufenden Runde 20→**64**
  (Snippet 160 Zeichen und 5 Anfragen pro Quelle bleiben).
- Grundlage ist Messung: über 348 lokale Sitzungen (70 mit Suche) ergaben sich Anfragen je Sitzung p50=7/p90=29/
  p95=38/p99=67, Quellen je Sitzung p50=16/p90=54/p95=63/p99=164, Quellen je Runde p50=16/p90=41/p95=51/max=65.
  Der alte Wert 20 lag bei etwa p55 — schon die Median-Sitzung wurde abgeschnitten, genau das erzeugt „0 Ergebnisse“.
- `stateVersion` auf 2: **auch ohne Formänderung Pflicht**. Ein Checkpoint unter den alten Grenzen hat
  Quellen bereits verworfen, und nur eine verworfene Zeile wird aus dem Event-Log neu gefaltet.
- Neuer dauerhafter Budget-Test: schlimmster Fall = 62.047 Bytes pro Rahmen (Budget 96 KB), plus Assertion, dass die
  Grenzen wirklich greifen; eine typische Sitzung liegt bei rund 15 KB.
- Die Grenzen kommen einstweilen nicht in die Einstellungen: sie wohnen im Host-Teil, und eine Konfigurationsfläche
  bräuchte Config-Schema, `.volatile()`-Heißwirkung und die Einstellungen auf allen sechs Linien — zudem nur
  vorwärts wirksam, denn ein höherer Wert holt verworfene Quellen nicht zurück.

## 0.9.9 — 2026-10-14 (Such-Cluster standardmäßig komplett gefaltet)

- Alle Abfrage-Cluster im Reiter „Suchen“ sind **standardmäßig gefaltet**, auch die der laufenden Runde:
  Der Reiter zeigt jetzt eine Zeile pro Frage mit der Zahl, die er wirklich enthält, statt sofort Blasen auszuschütten.
- Die vorherige Regel „aktuelle Runde aufgeklappt“ hat im echten Sitzungsbild die Fragenliste verdeckt, die man scannen will.
- Geöffnet wird, was angeklickt wird; der Zustand hängt am Query-Text, neue Frames klappen nichts zu.
- Das Feld `SearchCluster.latest` wurde entfernt, nachdem es niemand mehr konsumiert — ungenutzte Daten veralten.
- Tests prüfen jetzt: alles gefaltet per Default, ein Klick öffnet genau eine Gruppe, ein zweiter klappt sie wieder zu;
  der Link-Desinfektionstest öffnet zuerst, statt „nicht gerendert“ mit „kein Link“ zu verwechseln.

## 0.9.8 — 2026-10-14 (Gruppen ohne Inhalt behoben: Shape-Änderung braucht neue stateVersion)

- Behebt einen Fehler aus 0.9.7: die Gruppenüberschriften zählten Ergebnisse, beim Aufklappen war nichts da.
- Ursache: Der Falt-State ging von einem einzelnen `query`-String auf `queries[]` um, `stateVersion` blieb 0.
  Das Host-`restore` verwirft einen Checkpoint nur bei abweichender Version und spielt dann das Event-Log neu
  (`session-projection/src/index.ts:88-92`, `:122-126`) — der alte Row lief durch das neue Schema, alle `queries`-Felder
  wurden auf die leere Vorgabe gesetzt, jede Quelle rutschte in die Endgruppe.
- `stateVersion` ist jetzt 1: alte Checkpoints werden verworfen und korrekt neu gefaltet.
- Überschriften nennen nun die **tatsächlich enthaltenen** Einträge statt der Aufruf-`hits` — Titel und Inhalt können nicht mehr auseinanderlaufen.
- Leere Gruppen sind eine normale Zeile ohne Schalter; nicht zugeordnete Quellen bleiben in „Quellen · N“, nichts verschwindet still.
- Neuer Registrierungs-Guard: `stateVersion`=1 ist festgenagelt, plus der Nachweis, dass ein Alt-Row durch das neue Schema leer wird.

## 0.9.7 — 2026-10-14 (Ergebnisse nach Abfrage gruppiert und gefaltet)

- Der Reiter „Suchen“ gruppiert jetzt **pro Abfrage**: eine Zeile pro Frage (`Abfrage · N Ergebnisse`),
  aufgefaltet erscheinen die Ergebnis-Luftblasen dieser Abfrage statt einer durchlaufenden Liste.
- Standardmäßig ist nur die aktuelle Runde offen, ältere Gruppen bleiben gefaltet; der aufgefaltete Zustand
  hängt am Query-Text, neue Frames klappen zu, was die Leserin gerade geöffnet hat.
- Eine Quelle merkt sich **alle** Abfragen, die sie gebracht haben (`queries[]`, max 5, über Aufrufe hinweg vereinigt):
  ein zusammengelegter Multi-Query-Aufruf hängt nicht mehr an der letzten Frage allein; eine Quelle kann in mehreren Gruppen stehen — das ist die Tatsache, keine Doppelung.
- Quellen ohne zugewiesene gelistete Abfrage (ausgereizte Liste, altes Frame) landen in einer „Quellen · N“-Gruppe statt still zu verschwinden.
- Abwärtskompatibel: Schema-Defaults für `queries`, ein altes einzelnes `query`-Feld wird lesend zu `[query]` repariert.
- Das Werkzeug-Schild aus 0.9.5 ist wieder weg (die Daten bleiben im Frame, sie werden nur nicht mehr gezeichnet).

## 0.9.6 — 2026-10-14 (Suchreiter als Luftblasen-Strom statt Titelliste)

- Der Reiter „Suchen“ listet keine Abfragetitel mehr und zeigt keine Werkzeugmarken;
  die Gruppenüberschriften „Anfragen · N“ und „Quellen · N“ entfallen ebenfalls.
- Jede Quelle wird als **linksbündige Luftblase** gezeichnet — dieselbe Lesart wie der Chat links:
  Titel (anklickbarer Link), Domain, Snippet.
- Die Marke „Diese Runde“ sitzt jetzt in der Blase; mehrfach gefundene Quellen tragen dort ein `×N`.
- Am Faltwerk ändert sich nichts: Abfrage und Werkzeug bleiben im Frame `dshSummarySearchRefs`, sie werden nur nicht mehr gezeichnet.
- Hinweis auf fehlende Quellen und Kürzungs-Fußzeile bleiben; Link-Disziplin unverändert (nur http/https als Anker, mit `rel="noreferrer noopener"`).

## 0.9.5 — 2026-10-14 (Suchanfragen erfassen auch das Host-Tool web_search)

- Neben `advanced_search` wird jetzt auch `web_search` vom Harness gefaltet: das Modell greift
  standardmäßig auf das Host-Tool zu, sodass Sitzungen mit Suchen sonst leer blieben.
- Beide Argumentformen werden gelesen: `query` (Einzelfeld) und `queries` (Feldliste; eine
  Zusammenlegung mehrerer Anfragen ergibt eine Zeile pro Anfrage, Quellzahl bleibt die Gesamtzahl des Aufrufs).
- Jede Anfragezeile trägt den Werkzeugnamen (unübersetzt — er ist im Transkript durchsuchbar).
- Nachbau von 250 echten Sitzungen: Sitzungen mit Anfragen von 20 auf 52, dazu 472 Host-Zeilen und 777 Quellen.
- Der Leer-Hinweis nennt beide Werkzeuge (9 Sprachen); fehlt `tool` in einem alten Frame, wird die Zeile
  als `advanced_search` gelesen statt verworfen.

## 0.9.4 — 2026-10-14 (dritter Reiter „Suchen“ in den Referenzen)

- Neue Projektion `dshSummarySearchRefs`: faltet ausschließlich `advanced_search` (nicht den hosteigenen
  `web_search`) — für den Leser zwei verschiedene Tatsachen. Abfrage aus `tool/call.arguments.query`,
  Quellen aus `tool/result.meta.sources[]`; unentschiedene oder fehlerhafte Ergebnisse zählen nicht.
- Gruppen „Abfragen · N“ und „Quellen · N“; Provider-URLs sind nicht vertrauenswürdig, also werden nur
  http/https zu Links (mit `rel="noreferrer noopener"`), andere Schemata bleiben Text.
- Rückfall: ältere dsh-free-search-Builds senden kein `presentationMeta` — Abfragen zählen weiter,
  Quellen sind 0, und ein Hinweis erklärt das, statt eine leere Liste zu zeigen.
- Grenzen: 20 Einträge je Liste, Snippet bei 160 Zeichen; 10 neue Schlüssel in allen 9 Sprachen.

## 0.9.3 — 2026-10-13 (Skills und Memory nebeneinander in „Referenzen“)

- Die drei unteren Abschnitte (Skill-Referenzen, Sitzungsrückrufe, Speicher-Slots) sind jetzt ein
  Abschnitt „Referenzen“ mit zwei Reitern „Skills“ und „Speicher“: per Klick oder mit den
  Pfeiltasten umschaltbar; auf schmalen Sidebars verdrängen sie Fortschritt und Dateien nicht mehr.
- Der inaktive Pane bleibt montiert (`display:none`), damit Auswahl, laufende Bewertung
  und geöffnete Historie beim Wechseln nicht verloren gehen.
- Beide Reiter sind einzeln bedingt: kein Reiter, der ins Leere zeigt; ist nur Memory live, fällt die
  Vorschau auf Memory. Ohne beide Fähigkeiten verschwindet der Abschnitt ganz.
- 3 neue Schlüssel in allen 9 Sprachen.

## 0.9.2 — 2026-10-13 (zweiter Kanal für Skill-Referenzen plus Katalog)

- „Skill-Referenzen“ liest nicht mehr nur den `skill`-Toolaufruf: das vom Host selbst gesetzte
  `user/message.source.kind === 'skill-invocation'` (direkter Aufruf durch den Nutzer, der Host sagt
  dem Modell ausdrücklich, es solle das Tool nicht nochmal rufen) zählt in dieselbe Bilanz. Von 250 echten
  Sessions hatten 10 nur eine Invocation und keinen Toolaufruf — bisher zeigte diese Sektion nichts.
- Neue Gruppe „In dieser Sitzung verfügbar“ aus `entries[].name` der `skill-catalog`-Frames, standardmäßig
  gefaltet und nur als Zahl. Jeder Frame ersetzt die Liste vollständig (Kommentar des Hosts: `update`
  markiert eine Ersetzung), keine Vereinigung — sonst würden Skills nie wieder verschwinden. Referenzierte
  Namen werden abgezogen, ein Skill belegt nie zwei Zeilen.
- Der Leertext nennt beide Wege; 3 Gruppenschlüssel in allen 9 Sprachen. State bekam `catalog`/`catalogCount`,
  `stateVersion` 0→1 (mit Defaults, alte States laufen weiter).

## 0.9.1 — 2026-10-13 (Gruppierte Anzeige)

- Der Abschnitt „Produzierte Dateien“ zählt jetzt zwei getrennte Gruppen: „Dieser Durchlauf · N“
  direkt, „Frühere Änderungen · N“ gefaltet hinter einem Schalter. Wenn die Liste ein Limit hat, nennt
  eine Zusatzzeile die wahre Zahl der Sitzung („die Sitzung erzeugte M Dateien; die Liste ist gekürzt“).
- Die Sitzungsrückruf-Sektion trennt „Aktive Abrufe · N“ (Text noch im Kontext) von „Weitere Abrufe · N“
  (durch eine Zusammenfassung ersetzt); diese liegen gefaltet und tragen beim Aufklappen jeweils die
  Markierung „durch Zusammenfassung ersetzt“. Vorher blieb von ihnen nur eine Zahl übrig.
- Gemeinsame `FoldToggle`/`GroupHeader`-Komponenten; 5 Gruppenschlüssel in allen 9 Sprachen.

## 0.9.0 — 2026-10-13（首次上 npm；合并 0.9.0-local.0…8 全部装机测试内容）

Diese Version war erstmals auf npm veröffentlicht; sie enthält die gesamte local-Reihe: den Abschnitt
„Skill-Referenzen“ (der ursprüngliche Eintrag 0.9.0-local.8 unten), das Falt- und Zählverhalten bei
Überschreibung durch Kompaktierung sowie die Sync beider Manifeste (`dsh.plugin.json` stand auf `local.4`).

### Neu

- Abschnitt „Skill-Referenzen": listet die Skills, die diese Sitzung über das Host-Werkzeug skill tatsächlich geladen hat (Name · Ladevorgänge · Marke „diese Runde"). Datenquelle ist die Projektion dshSummarySkillUsage (regestriert von der Host-Hälfte dieses Plugins; synchrone Faltung über turn/start, tool/call, tool/result). Der Name kommt aus tool/call.arguments: das skill-Werkzeug deklariert auf allen sechs Linien kein presentationMeta (zeilenweise per git-tag geprüft), also gibt es kein strukturiertes tool/result.meta; der Ergebnis-Text wird bewusst nicht gelesen (Presentationsform ist keine zweite Wahrheitsquelle). Fehlgeschlagene Ladevorgänge zählen nicht. Kein Schalter — fehlt die Projektion, verschwindet der Abschnitt. 6 neue Schlüssel × 9 Sprachen.
- Versions-Synchronität der beiden Manifeste hergestellt: dsh.plugin.json stand auf 0.9.0-local.4, während package.json schon local.7 war (Tor V1 der Paketprüfung); beide jetzt 0.9.0-local.8.

## 0.9.0-local.0 – local.7 — 2026-10-12 → 10-13 (Installations-Pointer, nie auf der registry)

### Neu

- Darstellung des Recall-Bereichs: Titel auf zwei Zeilen geklemmt, Hover-Blase mit dem Volltext, als veraltet gemeldete Zeilen (retired) bleiben in der Liste und werden durchgestrichen.
- Falt- und Zähl-Verträge durch Tests festgeschrieben, einschließlich des Zweigs „alle Zeilen ersetzt ⇒ Zählhinweis" (er trägt ebenfalls die Markierung recall-superseded-note).

### Geändert

- Kompaction leert die Recall-Liste nicht mehr: ersetzte Zeilen (superseded) werden standardmäßig gefaltet und im Fuß gezählt; veraltete Zeilen bleiben durchgestrichen sichtbar — sie sind das menschliche Urteil über diese Erinnerung. Die 9 Sprachen wurden angepasst.

### Behoben

- Die Blase öffnet jetzt zur Zeilenseite nach links und überdeckt nicht mehr die Bewertungsleiste.
- Klicks in der Bewertungsleiste stoppen die Bubble-Weitergabe — die Bestätigung für „als veraltet melden" lief vorher nie.
- Kein natives title-Attribut mehr am Zeilentitel: es malte einen nicht skinbaren dunklen Kasten, der den Inhalt der Blase wiederholte.

## 0.8.0 — 2026-10-12

### Neu

- Abschnitt „Diese Sitzung recalled": gespeist aus der memoryRecall-Projektion von dsh-prime-memory — welche Erinnerungen tatsächlich injiziert wurden; mit Relevanzwertung (0–5) und „als veraltet melden" (-1, wiederherstellbar).

### Geändert

- Slot-Bereich standardmäßig aus: eine Karte „dauerhaft aktiver Slots" brachte bei, Erinnerung sei etwas Dauerhaftes — das Gegenteil von Relevanzabruf. Der Schalter bleibt für alle, die die gepinnte Liste wollen.

## 0.6.0 — 2026-10-09

### Geändert

- Einziges Max-Bereich-Version: keine Aufteilung mehr nach Host-Linie; engines.dsh und Peers enumerieren alle 15 rc-Linien in einem Schritt (erzeugt von sync-hosts).

## 0.5.0 — 2026-10-03 → 10-04 (beta.1–3 hochgestuft)

### Neu

- Speicher-Slot-Abschnitt (dritter Abschnitt des Übersichts-Tabs), gespeist aus dsh-prime-memory; Schalter showMemorySlots an zwei Stelle-Sitzen (Familien-Karte und Plugins-Seite).
- Aufgelöste refViews (record_id → Name-Zusammenfassung) gemäß dem Wire-Vertrag von prime-memory 0.20.1.
- Schichten in den Deliverables: sessionweit frühere Änderungen hinter eine Umschaltzeile gefaltet und gegen die aktiven Dateien dedupliziert.

## 0.4.0 — 2026-09-29

### Changed

- **Wechsel der Host-Linie auf DSH 0.2.0** (`main`, befördert aus `compat/0.2.0`): `engines.dsh` und der `@deepseek-ai/dsh-client-locale`-Peer wechseln von `>=0.1.5-rc.1 <0.2.0-0` zu `>=0.2.0-rc.1 <0.2.1-0` (Pinning auf das rc-Fenster; Neubewertung ab 0.2.1). Reine Metadaten-Adaption — die konsumierte Fläche besteht ausschließlich aus reinen `ctx.get(...)`-Aufrufern (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, mit eigenen lokalen Interface-Definitionen), und 0.2.0-rc.1 ist zur Plugin-API 0.1.7 voll kompatibel: null Codeänderungen. Die 0.1.x-Linie (0.1.5/0.1.7) wird weiter von den eingefrorenen Zweigen `compat/0.1.7` / `compat/0.1.5` (≤0.3.1) versorgt.
- Abhängigkeitsbaum auf die neue Linie aktualisiert (pnpm 12), Lockfile neu generiert; `pnpm-workspace.yaml` erhält `minimumReleaseAgeExclude` (stellt sicher, dass eine frisch installierte Maschine 0.2.0-rc.1 auflösen kann).
- Die Host-Bereichs-Assertions in `tests/purity.spec.ts` sind an die 0.2.0-Linie angepasst.
- **Installation (diese Linie)**: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Zuordnung der npm-dist-tags: `dsh-0.2.0` → diese Linie (`main`); `dsh-0.1.7` / `dsh-0.1.5` → 0.1.x-Linien (aus den Zweigen `compat/0.1.7` / `compat/0.1.5`).

### Documentation

- README um Installations- und Kompatibilitäts-Kurzfassungen in fünf Sprachen (de/fr/ru/es/it) ergänzt.
