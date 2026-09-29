# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

## 0.4.0 — 2026-09-29

### Changed

- **Wechsel der Host-Linie auf DSH 0.2.0** (`main`, befördert aus `compat/0.2.0`): `engines.dsh` und der `@deepseek-ai/dsh-client-locale`-Peer wechseln von `>=0.1.5-rc.1 <0.2.0-0` zu `>=0.2.0-rc.1 <0.2.1-0` (Pinning auf das rc-Fenster; Neubewertung ab 0.2.1). Reine Metadaten-Adaption — die konsumierte Fläche besteht ausschließlich aus reinen `ctx.get(...)`-Aufrufern (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, mit eigenen lokalen Interface-Definitionen), und 0.2.0-rc.1 ist zur Plugin-API 0.1.7 voll kompatibel: null Codeänderungen. Die 0.1.x-Linie (0.1.5/0.1.7) wird weiter von den eingefrorenen Zweigen `compat/0.1.7` / `compat/0.1.5` (≤0.3.1) versorgt.
- Abhängigkeitsbaum auf die neue Linie aktualisiert (pnpm 12), Lockfile neu generiert; `pnpm-workspace.yaml` erhält `minimumReleaseAgeExclude` (stellt sicher, dass eine frisch installierte Maschine 0.2.0-rc.1 auflösen kann).
- Die Host-Bereichs-Assertions in `tests/purity.spec.ts` sind an die 0.2.0-Linie angepasst.
- **Installation (diese Linie)**: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Zuordnung der npm-dist-tags: `dsh-0.2.0` → diese Linie (`main`); `dsh-0.1.7` / `dsh-0.1.5` → 0.1.x-Linien (aus den Zweigen `compat/0.1.7` / `compat/0.1.5`).

### Documentation

- README um Installations- und Kompatibilitäts-Kurzfassungen in fünf Sprachen (de/fr/ru/es/it) ergänzt.
