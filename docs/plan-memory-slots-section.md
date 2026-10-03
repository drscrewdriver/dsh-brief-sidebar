# 计划：brief-sidebar 接入 prime-memory 的 memorySlots 投影

> 状态：待决策（方案 A / B 二选一）· 2026-09-25
> 关联仓库：`dsh-brief-sidebar`（v0.3.1, HEAD 6f019d0）、`dsh-prime-memory`

## 1. 目标 / 非目标

**目标**：右栏「概要」tab 的第三个分区显示当前会话的激活槽位（active slot）——有多少、哪些 open、类型/优先级/正文，只读。

**非目标**：
- 不做槽位写操作（新建/关闭/改优先级）。写路径仍只走 `memory_slot_*` 工具与记忆面板。
- 不引入 `dsh-prime-memory` 依赖（peer 也不加）：prime-memory 缺席时该分区整体隐藏。

## 2. 现有契约（baseline，已核实）

| 侧 | 事实 |
| --- | --- |
| prime-memory `src/projection/slots.ts` | 注册服务端投影 `key='memorySlots'`，`stateVersion: 0`；wire view = `{rev,count,openCount,slots[]}`；`slots[]` 元素 = `{id,title,kind,status,priority}`；注释明写「只注册服务端单元…前端展示由未来 brief-sidebar 消费」 |
| prime-memory `src/store/slots.ts` | `SLOT_KINDS=['rule','todo','anchor','pointer']`、`SLOT_STATUSES=['open','done','dropped','expired']`；`Slot` 全量字段含 `body`(≤512)、`refs[]`、`pinned`、`validUntil?`、`origin`、`createdAt/updatedAt`；`SlotView` 注释：**不含 body —— 判定与生成正交，正文按需再取** |
| prime-memory `contract.ts` | **不存在任何 slots 读端点**（无 `dsh-memory/*slot*`），"按需再取"目前没有可用通道 |
| brief-sidebar `src/client/use-projection.ts` | `useProjectionValue(ctx, sessionId, key)` / `projectionSnapshot(...)`，key-agnostic，防御式解析：`ctx.get('sessions')` → `binding(id).session.projections.faceOf(key)`，不可达返回 `ABSENT` |
| brief-sidebar `src/client/SummaryTab.tsx` | 已预留第三个分区位（`key:'progress'` → `key:'deliverables'` → `null`），注释指定「记忆召回分区排在这里…经同一个 `faceOf` 通道接入，本期不渲染」 |
| brief-sidebar `src/client/summary/DeliverablesSection.tsx` | 分区样板：`useProjectionValue` → 窄化 → `undefined` 即 return null → 空态 / 列表两态；颜色仅用 `--dsw-alias-*` |
| brief-sidebar `src/client/locales.ts` | `zh` 为 key 集单一所有者，`en` 类型为 `Record<BriefKey,string>` ⇒ 漏 key 是**编译错**；`tests/purity.spec.ts` 断言 `t('…')` 引用的 key 必须存在 |

结论：接入点是现成的，**服务端投影就是双方约定的唯一契约**，不需要新建通道，也不应该跨仓直接引用对方模块。

## 3. 方案对比

### 方案 A —— 投影即全部（零触碰 prime-memory）
只读现有 view 字段：`title / kind / status / priority`。分区能出现、能判断"有几个 open 槽位"，但**看不到槽位正文 `body` 与 `refs`**——用户说"显示 memory-slot 内容"时，这通常不够。

- 改动面：仅 brief-sidebar（1 个 section + 1 个 reader + locales + tests）
- 复核：不动已发布插件，零回归风险

### 方案 B —— 扩展 wire view 带 `body/pinned/refs`（推荐）
prime-memory 的 `SlotView`/`SlotsViewSlot` 增加 `body`、`pinned`、`refs`，brief-sidebar 渲染正文（超长截断 + 展开）。

- 与现有注释的冲突需要显式裁决：注释说"不含 body，判定与生成正交"——该正交性针对**判定/LLM 路径**（不把正文灌进上下文）；而这里消费者是**只读展示面**，正文按需再取本就没有通道（无端点），因此把 body 放进 wire view 是当前唯一可行路径。
- 改动面：prime-memory（store 投影快照 + projection schema + F9 字段集单测）+ brief-sidebar（同方案 A 的全部）
- 兼容性处理：新字段在 `parseSlotsPayload` 里**存在才校验**，不设为必需 —— 否则历史持久化 checkpoint 行会被 `stateSchema` 整条丢弃（静默清历史投影态）。**不 bump `stateVersion`**（附加字段，消费端防御式窄化）。

### 方案 C —— 新增读端点按需取正文（不推荐）
prime-memory 增 `dsh-memory/slots-list`，brief-sidebar 点开再取。最忠于原注释，但要新增端点 + 客户端请求通道 + 权限模型确认，改动面与回归面最大，而收益只是省掉 ≤512 字的 payload。

## 4. 微任务拆解（方案 B；边界=文件级）

| # | 仓库 | 文件 | 动作 | 预估 |
| --- | --- | --- | --- | --- |
| T1 | prime-memory | `src/store/slots.ts` | `SlotView` + `projectionSnapshot()` 透出 `body/pinned/refs`（只读副本，不改活引用约定） | 5min |
| T2 | prime-memory | `src/projection/slots.ts` | `SlotsViewSlot` 同步 3 字段；`parseSlotsPayload` 加"存在才校验"分支 | 5min |
| T3 | prime-memory | `tests/slots-projection.test.ts`、`tests/slots-store.test.ts` | 更新字段集断言（F9）；补"旧 checkpoint 缺新字段仍可通过"用例 | 10min |
| T4 | brief-sidebar | `src/client/brief/use-slots.ts`（新） | `MEMORY_SLOTS_KEY='memorySlots'` + `readSlots()` 防御式窄化：`undefined`=能力缺席；非法=不可用；返回 `{rev,count,openCount,slots}` | 5min |
| T5 | brief-sidebar | `src/client/summary/MemorySlotsSection.tsx`（新） | 三态渲染：缺席 `return null` / 空态 / 列表（标题 + kind/status pill + priority + pinned 标记 + body 截断 + refs 行） | 15min |
| T6 | brief-sidebar | `src/client/SummaryTab.tsx` | 预留 `null` → `MemorySlotsSection`（固定最底，`key:'memory-slots'`） | 2min |
| T7 | brief-sidebar | `src/client/locales.ts` | 加 `section.memorySlots`、`slots.empty`、`slots.emptyHint`、`slots.pinned`、`slots.openCount` 等 zh/en 成对 key | 5min |
| T8 | brief-sidebar | `tests/slots-section.spec.tsx`（新） | 三态 + 截断 + 缺字段容错 | 10min |
| T9 | 两仓 | — | `pnpm typecheck` + `pnpm test`；brief-sidebar 构建 `lib/`；挂到本机 DSH 0.1.5-rc.2 实测右栏第三分区 | 10min |

## 5. 验证断言（每维度一条）

- **A1 缺席不报错**：prime-memory 未注册 `memorySlots` 时 `faceOf` 返回 `undefined` ⇒ 分区不渲染、不抛错（对齐 deliverables 的 optional 语义）。
- **A2 渲染正确**：有 1 个 open 槽位时，标题/kind/status/priority/pinned/body 与 `slots.json` 一致，`openCount` 等于 open 数。
- **A3 i18n 完整**：`t('…')` 引用的每个 key 在 `zh`/`en` 均存在（`purity.spec` 断言 + `en` 类型编译错兜底）。
- **A4 引用稳定**：prime-memory 侧 rev 不变时 view 返回同引用（`WeakMap` 契约不破），brief-sidebar 不因投影帧重复重渲染。
- **A5 兼容不倒退**：缺 `body/pinned/refs` 的旧 checkpoint 行仍能通过 `stateSchema.parse`，不被整条丢弃。

## 6. 风险与回退

- 若 A5 处理成"新字段必需"，会造成历史投影态静默清空 —— 必须走"存在才校验"。
- 若把 body 灌进 `state`（不仅是 wire view），会扩大持久化体积；本次只扩 wire view + 快照读取，不改存储层。
- brief-sidebar 的 `files` 白名单不含 `docs/`，本计划文档不随 npm 包发布。
- 回退：两仓各自单文件级 revert（brief-sidebar 把 T6 的 section 换回 `null` 即恢复"本期不渲染"）。
