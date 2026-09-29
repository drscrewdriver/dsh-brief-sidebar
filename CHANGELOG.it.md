# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

## 0.4.0 — 2026-09-29

### Changed

- **Passaggio della linea host a DSH 0.2.0** (`main`, promosso da `compat/0.2.0`): `engines.dsh` e il peer `@deepseek-ai/dsh-client-locale` passano da `>=0.1.5-rc.1 <0.2.0-0` a `>=0.2.0-rc.1 <0.2.1-0` (blocco sulla finestra rc; rivalutazione da 0.2.1 in poi). Adattamento di soli metadati — la superficie consumata è interamente fatta di caller puri di `ctx.get(...)` (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, con definizioni di interfacce locali), e 0.2.0-rc.1 è pienamente compatibile con l'API plugin di 0.1.7: zero modifiche al codice. La linea 0.1.x (0.1.5/0.1.7) resta servita dai rami congelati `compat/0.1.7` / `compat/0.1.5` (≤0.3.1).
- Albero delle dipendenze aggiornato alla nuova linea (pnpm 12), lockfile rigenerato; `pnpm-workspace.yaml` aggiunge `minimumReleaseAgeExclude` (garantisce che una macchina appena installata possa risolvere 0.2.0-rc.1).
- Le asserzioni sull'intervallo host di `tests/purity.spec.ts` sono allineate alla linea 0.2.0.
- **Installazione (questa linea)**: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Mappatura dei dist-tag npm: `dsh-0.2.0` → questa linea (`main`); `dsh-0.1.7` / `dsh-0.1.5` → linee 0.1.x (provenienti dai rami `compat/0.1.7` / `compat/0.1.5`).

### Documentation

- README arricchito con panoramiche di installazione e compatibilità in cinque lingue (de/fr/ru/es/it).
