# Changelog — dsh-brief-sidebar

## 0.4.0 — 2026-09-29

### Changed

- **宿主线换代到 DSH 0.2.0**（`main`，自 `compat/0.2.0` 升格）：`engines.dsh` 与 `@deepseek-ai/dsh-client-locale` peer 从 `>=0.1.5-rc.1 <0.2.0-0` 换到 `>=0.2.0-rc.1 <0.2.1-0`（rc 窗口锁线，0.2.1 起重新评估）。纯元数据适配——消费面全部是 `ctx.get(...)` 纯 caller（`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`，自带本地接口定义），0.2.0-rc.1 对 0.1.7 插件 API 完全兼容，零代码修改。0.1.x 线（0.1.5/0.1.7）由冻结分支 `compat/0.1.7` / `compat/0.1.5`（≤0.3.1）继续服务。
- 依赖树按新线刷新（pnpm 12），lockfile 重新生成；`pnpm-workspace.yaml` 增加 `minimumReleaseAgeExclude`（保证新装机器可解析 0.2.0-rc.1）。
- `tests/purity.spec.ts` 的宿主范围断言同步到 0.2.0 线。
- **安装（本线）**：`dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`。npm dist-tag 映射：`dsh-0.2.0` → 本线（`main`）；`dsh-0.1.7` / `dsh-0.1.5` → 0.1.x 线（`compat/0.1.7` / `compat/0.1.5` 分支出）。

### Documentation

- README 增补德/法/俄/西/意五语安装与兼容性速览。
