# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

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
