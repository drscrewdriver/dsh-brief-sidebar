# Changelog — dsh-brief-sidebar

[简体中文](CHANGELOG.md) | [Français](CHANGELOG.fr.md) | [Deutsch](CHANGELOG.de.md) | [Italiano](CHANGELOG.it.md) | [Русский](CHANGELOG.ru.md) | [Español](CHANGELOG.es.md)

## 0.4.0 — 2026-09-29

### Changed

- **Переход хостовой линии на DSH 0.2.0** (`main`, повышена из `compat/0.2.0`): `engines.dsh` и peer-зависимость `@deepseek-ai/dsh-client-locale` меняются с `>=0.1.5-rc.1 <0.2.0-0` на `>=0.2.0-rc.1 <0.2.1-0` (фиксация на rc-окне; переоценка начиная с 0.2.1). Чисто метаданная адаптация — потребляемая поверхность целиком состоит из чистых вызовов `ctx.get(...)` (`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`, с собственными локальными определениями интерфейсов), а 0.2.0-rc.1 полностью совместим с plugin API 0.1.7: ноль изменений кода. Линия 0.1.x (0.1.5/0.1.7) продолжает обслуживаться замороженными ветками `compat/0.1.7` / `compat/0.1.5` (≤0.3.1).
- Дерево зависимостей обновлено под новую линию (pnpm 12), lockfile перегенерирован; в `pnpm-workspace.yaml` добавлен `minimumReleaseAgeExclude` (гарантирует, что свежеустановленная машина сможет разрешить 0.2.0-rc.1).
- Утверждения о диапазоне хоста в `tests/purity.spec.ts` синхронизированы с линией 0.2.0.
- **Установка (эта линия)**: `dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`. Соответствие dist-тегов npm: `dsh-0.2.0` → эта линия (`main`); `dsh-0.1.7` / `dsh-0.1.5` → линии 0.1.x (выходят из веток `compat/0.1.7` / `compat/0.1.5`).

### Documentation

- В README добавлены краткие обзоры установки и совместимости на пяти языках (de/fr/ru/es/it).
