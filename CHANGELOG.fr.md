# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

## 0.4.0 — 2026-09-29

### Changed

- **Migration de la ligne hôte vers DSH 0.2.0** (`main`, promue depuis `compat/0.2.0`) : `engines.dsh` et le peer `@deepseek-ai/dsh-client-locale` passent de `>=0.1.5-rc.1 <0.2.0-0` à `>=0.2.0-rc.1 <0.2.1-0` (verrouillage sur la fenêtre rc ; réévaluation à partir de 0.2.1). Adaptation purement métadonnées — toute la surface consommée se limite à des callers purs de `ctx.get(...)` (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, avec définitions d'interfaces locales), et 0.2.0-rc.1 est totalement rétrocompatible avec l'API de plugins 0.1.7 : zéro modification de code. La ligne 0.1.x (0.1.5/0.1.7) continue d'être servie par les branches gelées `compat/0.1.7` / `compat/0.1.5` (≤0.3.1).
- Arbre de dépendances actualisé pour la nouvelle ligne (pnpm 12), lockfile régénérée ; `pnpm-workspace.yaml` ajoute `minimumReleaseAgeExclude` (garantit qu'une machine fraîchement installée peut résoudre 0.2.0-rc.1).
- Les assertions de plage hôte de `tests/purity.spec.ts` sont alignées sur la ligne 0.2.0.
- **Installation (cette ligne)** : `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Correspondance des dist-tags npm : `dsh-0.2.0` → cette ligne (`main`) ; `dsh-0.1.7` / `dsh-0.1.5` → lignes 0.1.x (issues des branches `compat/0.1.7` / `compat/0.1.5`).

### Documentation

- Ajout au README d'aperçus d'installation et de compatibilité en cinq langues (de/fr/ru/es/it).
