# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

## 0.4.0 — 2026-09-29

### Changed

- **Cambio de la línea host a DSH 0.2.0** (`main`, ascendida desde `compat/0.2.0`): `engines.dsh` y el peer `@deepseek-ai/dsh-client-locale` pasan de `>=0.1.5-rc.1 <0.2.0-0` a `>=0.2.0-rc.1 <0.2.1-0` (fijación a la ventana rc; reevaluación a partir de 0.2.1). Adaptación puramente de metadatos — la superficie consumida consiste íntegramente en callers puros de `ctx.get(...)` (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, con definiciones de interfaces locales), y 0.2.0-rc.1 es totalmente compatible con la API de plugins de 0.1.7: cero cambios de código. La línea 0.1.x (0.1.5/0.1.7) sigue siendo atendida por las ramas congeladas `compat/0.1.7` / `compat/0.1.5` (≤0.3.1).
- Árbol de dependencias actualizado a la nueva línea (pnpm 12), lockfile regenerado; `pnpm-workspace.yaml` añade `minimumReleaseAgeExclude` (garantiza que una máquina recién instalada pueda resolver 0.2.0-rc.1).
- Las aserciones de rango de host en `tests/purity.spec.ts` se sincronizan con la línea 0.2.0.
- **Instalación (esta línea)**: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Mapa de dist-tags de npm: `dsh-0.2.0` → esta línea (`main`); `dsh-0.1.7` / `dsh-0.1.5` → líneas 0.1.x (salidas de las ramas `compat/0.1.7` / `compat/0.1.5`).

### Documentation

- README ampliado con resúmenes de instalación y compatibilidad en cinco idiomas (de/fr/ru/es/it).
