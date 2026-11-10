# 计划：brief-sidebar 接入 dsh-spirit 0.8.0 —— 检视活跃 echo 条目（指路 + 可选完整列表）

> 状态：待决策（建议先做 A 的「指路行」，B 按需）· 面向 dsh-spirit 0.8.0（npm latest 已验证）
> 关联仓库：`dsh-brief-sidebar`（0.9.20）、`dsh-spirit`（0.8.0，commit c8af8d3）
> 本文只描述 brief-sidebar 侧的改动与所需契约；不要求跨仓直接 import 对方模块（与 `docs/plan-memory-slots-section.md` 同一条纪律）。

## 1. 目标 / 非目标

**目标**：右栏「概要」tab 出现一行 **活跃 echo 指路**：显示本会话最近的注入回响条数、最近一条是「注入」还是「跳过（门名）」，并给出去哪里看全文的明确指路（记忆星海 → 翻阅 → 回响）。可选：展开显示最近 3 条的摘要。

**非目标**：
- 不做 echo 的写操作（echo 是只读观测面）。
- 不引入 `dsh-spirit` 依赖（peer 也不加）：spirit 缺席 ⇒ 整行隐藏。
- 不展示/持久化 echo 卡全文以外的会话正文（echo 文本本身就是第一人称注入卡，见 §3 隐私边界）。

## 2. 现状事实（baseline，已核实）

| 侧 | 事实 |
| --- | --- |
| brief-sidebar `src/client/use-projection.ts` | 投影通道 `useProjectionValue(ctx, sessionId, key)`；不可达返回 `ABSENT`。这是本仓既有的插件互通方式 |
| brief-sidebar `src/client/SummaryTab.tsx` | 分区序列 `progress → deliverables → (预留 null)`，注释指定「记忆召回分区排在这里」 |
| brief-sidebar `src/client/locales.ts` | `zh` 是 key 集单一所有者，`en: Record<BriefKey,string>` ⇒ 漏 key 是编译错；`tests/purity.spec.ts` 断言 key 存在 |
| dsh-spirit 0.8.0 | **只提供 RPC，无服务端投影面**：路由根 `/dsh-spirit/rpc`，op 路径 `/dsh-spirit/rpc/<op>`（同源 loopback，Host 头有 fence） |
| dsh-spirit echo 面 | 每轮 `agent/pre-step` 落一条快照；**进程内环形缓冲 200 条，不落库，插件重启归零**；`inject-echo` 端点读它 |
| dsh-spirit 注入卡 | 以 `<system-reminder>` 包裹的第一人称快照，`source.kind='plugin:spirit'`，section 名 `spirit:slot`；echo 存的就是这段文本 |

结论：本仓现有互通面是投影，而 spirit 目前只有 RPC —— 这是本文要立的第一个决定（见 §4 方案对比）。

## 3. 契约（spirit 0.8.0 原样，无需改动）

### 3.1 `inject-echo`（回答「活跃 echo」的核心）

`GET /dsh-spirit/rpc/inject-echo?sessionId=<id>&limit=20`（同源 fetch；`sessionId` 省略=跨会话最近）

```ts
// 响应信封（所有 spirit op 同形）
type Envelope<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } };

interface SpiritEchoSnapshot {
  at: number;            // 毫秒时间戳
  agentId: string;
  sessionId: string;
  workspaceId: string;
  kind: 'injected' | 'skipped';
  reason: string;        // skipped 时的门名（如 'no-new-user' / 'budget' / 'duplicate-fingerprint'），injected 为空串
  fingerprint: string;   // 注入指纹（同内容同指纹；用于「这轮没发新卡」的判读）
  text: string;          // 注入卡全文（skipped 为空串）——见 §7 隐私边界
  bytes: number;         // 卡字节数
  segments: Array<{ name: string; lines: number }>; // 状态/反馈/线程/记着/惦记/事务/刚刚/想起/开场 的行数
}
interface SpiritInjectEchoResult { items: SpiritEchoSnapshot[]; total: number; } // total=缓冲当前总条数
```

### 3.2 可选：记忆与人格面的指路（同版本提供，非本计划必须）

| op | 请求 | 响应（要点） |
| --- | --- | --- |
| `memory-list` | `{workspaceId?, limit?}` | `{life[], work[], diary[], goals[]}`；`life/work/diary` 行 = `{id,scope,kind,text,workspaceId,pinned,createdAt,updatedAt}` |
| `persona-effective` | `{workspaceId?, sessionId?}` | `{source:'session'\|'workspace'\|'active'\|'current', presetId?, presetName?, revision, name, voice, projectedText}` |
| `persona-presets` | `{}` | `{activeId, activeName, presets[], workspaces, sessions[], audit[]}` |

## 4. 方案对比（第一个决定）

### 方案 A —— 客户端直读 RPC + 指路行（推荐先做）

SummaryTab 里加一个探针行：`活跃 echo：N 条 · 最近：注入/跳过（门名） · 查看 →`。数据来自同源 `fetch('/dsh-spirit/rpc/inject-echo?sessionId=…&limit=5')`。

- 改动面：仅 brief-sidebar（1 个 reader + 1 个行组件 + locales + tests）
- spirit 缺席：`fetch` 404 / `ok:false` ⇒ 整行 `return null`（与 deliverables 的 optional 语义一致）
- 不新增投影面，不动 spirit（0.8.0 即可用）
- 代价：本仓第一次出现"插件互通走 RPC"的耦合；需在 reader 里做防御式窄化（字段缺失/类型错 ⇒ `undefined`）

### 方案 B —— spirit 注册服务端投影 `spiritEcho` + 完整列表分区（更贴本仓架构）

spirit 一侧新增投影面（host spec，非本仓改动）：

```ts
// dsh-spirit 侧（未来版本）：服务端投影
registerProjection?({
  key: 'spiritEcho',
  stateVersion: 1,            // 新面，从 1 起
  view: () => ({ rev, total, items: SpiritEchoSnapshot[] }), // items ≤ 20，倒序
  absent: () => undefined,    // 插件未启用/无数据 ⇒ undefined（消费端当能力缺席）
});
```

brief-sidebar 侧完全复用 `plan-memory-slots-section.md` 的样板：`use-spirit-echo.ts`（防御式窄化）+ `SpiritEchoSection.tsx`（缺席 null / 空态 / 列表）。

- 优点：零跨插件 RPC 耦合、与既有 `faceOf` 纪律一致
- 代价：两仓联动，需要 spirit 先发版

### 方案 C —— 只做静态指路（零取数）

固定一行文案「想看这轮注入了什么 → 记忆星海 → 翻阅 → 回响」，不带数字。
- 零耦合零风险，但"活跃"二字没体现；仅在 A 的 fetch 被安全策略挡住时作为降级

**建议**：先 A（当天可上），若后续需要"在侧栏列全文"再上 B；C 作为 A 的失败降级文案。

## 5. 微任务拆解（方案 A；边界=文件级）

| # | 文件 | 动作 | 预估 |
| --- | --- | --- | --- |
| T1 | `src/client/spirit-echo.ts`（新） | `readSpiritEcho(sessionId, limit)`：同源 fetch → `Envelope` 窄化 → 非法/不可达返回 `undefined`；AbortController 超时 1.5s | 15min |
| T2 | `src/client/summary/SpiritEchoLine.tsx`（新） | 三态：`undefined`⇒null / `total===0`⇒"暂无（插件重启会归零）" / 有数据⇒`活跃 echo：N 条 · 最近：注入\|跳过（门名） · 查看 →`；点击=复制指路文案（侧栏无法直接切到星海面板） | 20min |
| T3 | `src/client/SummaryTab.tsx` | 预留 `null` → `SpiritEchoLine`（排在 deliverables 之后、memory-slots 之前） | 2min |
| T4 | `src/client/locales.ts` | 加 `echo.active`、`echo.empty`、`echo.emptyHint`、`echo.injected`、`echo.skipped`、`echo.goto`（zh/en 成对） | 5min |
| T5 | `tests/spirit-echo.spec.tsx`（新） | 三态 + 门名透传 + fetch 拒绝不抛 + 超时降级为 null | 15min |
| T6 | 本机 | `pnpm typecheck` + `pnpm test` + 构建 `lib/`；装 spirit 0.8.0 的 profile 实测右栏 | 10min |
| T7（可选） | 两仓 | 走方案 B 投影面时拆成 spirit 侧 1 张单（投影注册 + 测试）+ 本仓 3 张单（reader/section/SummaryTab） | — |

## 6. 验证断言（每维度一条）

- **A1 缺席不报错**：spirit 未装 / 端点 404 时 `readSpiritEcho` 返回 `undefined`，分区不渲染、不抛错。
- **A2 数字正确**：`items` 与库内最近 5 条一致，`total` 等于缓冲总条数；最近一条 `kind`/`reason` 原样显示。
- **A3 重启归零语义**：spirit 重启后 `total===0` 显示「暂无（插件重启会归零）」，不显示"错误"。
- **A4 超时降级**：fetch 1.5s 超时 ⇒ 静默 `undefined`，不阻塞 SummaryTab 其他分区。
- **A5 i18n 完整**：新增 6 个 key 在 `zh`/`en` 均存在（`purity.spec` + `en` 类型编译错兜底）。
- **A6 指路可用**：点击「查看 →」得到的文案能按字面找到路径「记忆星海 → 翻阅 → 回响」。

## 7. 隐私与风险边界

- echo 的 `text` 是**注入卡原文**（第一人称体验快照，经脱敏/黑名单闸；不含工具返回正文）。侧栏只做只读展示，不落本地存储、不打日志。
- echo 缓冲在进程内：**重启归零**是设计（观测面不是真源），文案必须说清，避免被当故障。
- 只做「按会话 + limit」拉取；不做轮询（SummaryTab 打开时取一次，手动刷新可再取）。
- 回退：把 SummaryTab 的 section 换回 `null` 即恢复"本期不渲染"；reader 文件保留不影响构建。

## 8. 与 0.8.0 其它新面的关系（供排期参考）

- `memory-list` 的 life/work/diary/goals 四组可直接复用本计划的 reader 模式，做「记着」摘要分区（二选一：先 echo 后记着）。
- `persona-effective` 的 `source`（session/workspace/active/current）适合做一行「生效人设：会话绑定（俏皮同伴）」的指路。
- 以上均不进本计划的必做范围，避免首版铺太宽。