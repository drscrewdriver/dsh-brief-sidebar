# Changelog — dsh-brief-sidebar

## 0.5.0-beta.2 — 2026-10-03

### Added

- **记忆槽位引用解析（配 dsh-prime-memory 0.20.1 修复版）**：wire view 新增 `refViews`（record_id → `[type] 名称简述`，由 prime-memory 在投影帧构建时经 L1 `getByIds` 解析）。记忆分区渲染优先用解析后的名称简述（原始 refs 进 tooltip），host 未解析时回落原始 refs。窄化保持"存在才收、畸形条目丢弃"。

## 0.5.0-beta.1 — 2026-10-03（分支 `feat/0.2.0-memory-slots`，npm dist-tag `beta`）

> 预发布：`dsh plugin --profile web add dsh-brief-sidebar@beta`。`latest` 与 `dsh-0.2.0` 不动（仍在 0.4.0），稳定后正式发 0.5.0。

### Added

- **概要 tab 第三分区：记忆槽位（只读）**。订阅 `dsh-prime-memory` 注册的 `memorySlots` 投影（wire view `{rev, count, openCount, slots[]}`），渲染激活槽位的标题 / kind pill / 状态 / 优先级，底部显示开启数。两道门控都满足才渲染，缺一整段隐藏：①开关打开（见下）；②投影存在（prime-memory 不在 composition 时 `faceOf` 恒 `undefined`）。对 prime-memory 未来在 wire view 上追加 `body`/`refs` 做了前向兼容窄化（存在且合法才展示，正文截断 + 全文进 tooltip）。
- **记忆分区开关 `showMemorySlots`**，按 dsh-thinking-levels 的双入口模式挂两个面、同一个组件同一个 inject 工厂（一份真相）：
  - **插件家族设置节**（「起子插件设置」）：贡献卡片到 `dsh-family.tab` 子席位（id `brief-sidebar`，order 30）；
  - **插件管理页配置卡**：`plugins.bundle.config` keyed 席位（key = 包名 `dsh-brief-sidebar`）。
  - 服务端 `Config` schema（`z.boolean().default(true).volatile()`，schemastery 进入 `dependencies`，tsdown 外置不打包）；客户端经 `configForms.get('dsh-brief-sidebar')` 读写，改动即时提交、开着的 tab 下一次渲染即生效。`configForms` 经延迟 inject 解析（服务可能晚于 apply 启动）；宿主没有该服务时卡片不注册，开关回落默认「开」。
- i18n：新增 `section.memorySlots` / `slots.*` / `settings.*` 共 14 个 key，九语（zh/en/ja/ko/fr/de/it/ru/es）同步。

### Changed

- `SummaryTab` 预留的记忆召回插槽位（原样 `null`）换成 `MemorySlotsSection`（固定最底：进展 → 产物 → 记忆）。
- `pnpm-workspace.yaml` 补 `packages: ['.']`（pnpm 10+ 拒绝无该字段的 workspace 文件执行 add/install）。

## 0.4.0 — 2026-09-29

### Changed

- **宿主线换代到 DSH 0.2.0**（`main`，自 `compat/0.2.0` 升格）：`engines.dsh` 与 `@deepseek-ai/dsh-client-locale` peer 从 `>=0.1.5-rc.1 <0.2.0-0` 换到 `>=0.2.0-rc.1 <0.2.1-0`（rc 窗口锁线，0.2.1 起重新评估）。纯元数据适配——消费面全部是 `ctx.get(...)` 纯 caller（`slots` / `locale` / `betterSidebar` / `sidebarRight` / `sessions`，自带本地接口定义），0.2.0-rc.1 对 0.1.7 插件 API 完全兼容，零代码修改。0.1.x 线（0.1.5/0.1.7）由冻结分支 `compat/0.1.7` / `compat/0.1.5`（≤0.3.1）继续服务。
- 依赖树按新线刷新（pnpm 12），lockfile 重新生成；`pnpm-workspace.yaml` 增加 `minimumReleaseAgeExclude`（保证新装机器可解析 0.2.0-rc.1）。
- `tests/purity.spec.ts` 的宿主范围断言同步到 0.2.0 线。
- **安装（本线）**：`dsh plugin --profile web add dsh-brief-sidebar@dsh-0.2.0`。npm dist-tag 映射：`dsh-0.2.0` → 本线（`main`）；`dsh-0.1.7` / `dsh-0.1.5` → 0.1.x 线（`compat/0.1.7` / `compat/0.1.5` 分支出）。

### Documentation

- README 增补德/法/俄/西/意五语安装与兼容性速览。
