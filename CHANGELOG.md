# Changelog — dsh-brief-sidebar

## 0.9.1 — 2026-10-13（分组显示）

- 产物节拆成两组各自计数：「本回合改动 · N」直列，「更早改动的文件 · N」折叠在开关后。
  列表有上限时另起附注给出会话真数（「会话共 M 个文件，列表已截断」），两个数不再混谈。
- 本会话召回节拆成两组：「活跃召回 · N」（正文仍在上下文）直列；「其余历史召回 · N」（被摘要取代）
  折叠在开关后，展开后每条自带「已被摘要取代」标记。此前被取代项只剩一个计数，读者看不到内容。
- 抽出共享的 `FoldToggle`/`GroupHeader`，两节用同一套折叠外观；新增 9 语 5 个分组键。

## 0.9.0 — 2026-10-13（首次上 npm；合并 0.9.0-local.0…8 全部装机测试内容）

本节是 0.9.0 首次发布到 npm，内容即 local 系列的全部：技能引用小节（下方 0.9.0-local.8 原条目）、
召回分区的压缩取代折叠与计数契约、以及双清单同步（`dsh.plugin.json` 曾停在 `local.4`）。它一并带上了此前只在本地发过的
「本会话召回」分区与显示面修复（见下方各节）。

### Added

- **技能引用分区**：概要 tab 新增只读小节，列出本会话通过宿主 `skill` 工具**成功载入**的技能
  （技能名 · 载入次数 · 本轮标签）。数据源是投影 `dshSummarySkillUsage`（本插件 host 半注册，
  纯同步折叠 `turn/start` / `tool/call` / `tool/result`）。技能名取自 `tool/call.arguments`：
  `skill` 工具在六线宿主上都**没有声明 `presentationMeta`**（逐 git tag 核过），所以
  `tool/result.meta` 对技能不存在；结果文本也不读（那是展示形，不能当第二个事实源）。
  失败的调用不算引用（与产物分区同口径）。新增 6 个 key × 9 语。投影缺席即整段隐藏，
  不设开关（它只陈述已发生的事）。

### Fixed

- **双清单版本同步**：`dsh.plugin.json` 停在 `0.9.0-local.4` 而 `package.json` 已到 `local.7`
  （包门禁 V1 报错），现两面均为 `0.9.0-local.8`。

> 记一笔诚实账：`0.6.0`→`0.9.0-local.7` 这一批（本会话召回分区、压缩取代语义、交付物分层等）
> **没有逐版写进本文件**，只到了这一节才补。若要把那段补齐，它是一次独立的补写。

## 0.9.0-local.0 – local.7 — 2026-10-12 → 10-13（装机指针，未上 registry）

### Added

- 召回分区显示面：条目标题两行钳制、悬停泡泡给全文、已判过时（retired）的行划删除线并留在列表里。
- 用用例钉住折叠与计数契约，含「全部行都被取代时走计数告知」这一支（它也挂 recall-superseded-note 标记）。

### Changed

- 压缩不再清空召回列表：被摘要取代（superseded）的行默认折叠、页脚报隐藏数；判过时的行照旧保留删除线——那是人对这条记忆的裁决凭证。9 语相关文案同步改口。

### Fixed

- 泡泡改朝行左侧开，不再盖住同一分区的打分条。
- 打分条内的点击停止冒泡——「声明过时」的二次确认此前从未真正生效。
- 行标题不再挂原生 title：那会多出一个不受皮肤契约管的黑色提示框，还与泡泡内容重复。

## 0.8.0 — 2026-10-12

### Added

- 「本会话召回」分区：吃 dsh-prime-memory 的 memoryRecall 投影，回答「这个会话实际注入了哪些记忆」；带相关度打分（0–5）与「声明过时」（-1，可恢复）。

### Changed

- 记忆槽位分区默认关：常驻槽位卡教会人把记忆读成「常驻物」，与相关性召回相反。开关留着，想要列表的人可自开。

## 0.6.0 — 2026-10-09

### Changed

- 单一大范围版本：不再按宿主线切版本，engines.dsh 与 peer 一次枚举到 15 条 rc 线（enumeration 由 sync-hosts 生成）。

## 0.5.0 — 2026-10-04（转正）

> beta.1~3 全部能力定版,挂 `latest` 与 `dsh-0.2.0`。内容见下。

## 0.5.0-beta.3 — 2026-10-03

### Added

- **产物分区分层**:活跃文件(本回合 latest)保持直接列表;"全会话更早改动"折叠进开关行(计数 = 与活跃文件按归一化路径去重后的条数),展开后是与活跃区相同的可点击文件行(点击走侧栏预览)。新增 `deliverables.history` 九语 key,`deliverables.sessionTotal` 退役(`sessionTotal` 仍是 wire 字段,仅不再单独渲染)。

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
