# dsh-todo-sidebar

DSH web 插件（`dsh-better-sidebar` 消费方）：把会话的 **`todos` 投影**渲染成右侧栏里的一个「任务」tab 看板，
并**遮蔽** DSH 官方那条 composer 上方的 todo 面板，使看板成为 todo 的唯一可见载体。

只读展示：不做编辑、不做写回、不做多会话聚合、不复制任何第三方渲染层。

## 需求映射

| 编号 | 需求 | 实现位置 |
|---|---|---|
| R1 | 插件挂载期间官方 todo 条完全不渲染 | `src/client/todo/dock-shadow.tsx` |
| R2 | 新建独立插件，向 better-sidebar 注册「任务」tab | `src/client/index.tsx` |
| R3 | 数据只来自 Host 计算的 `todos` 投影，无客户端折叠、无写回 | `src/client/todo/use-todos.ts` + `board.ts` |
| R4 | 普通 React + `--dsw-alias-*` token，与 Canvas 插件零代码/命名关系 | `src/client/TodoBoardTab.tsx` + `TodoIcon.tsx` |
| R5 | 可逆：插件禁用/卸载后官方 dock 自动恢复 | 所有注册都走 `ctx.effect`，disposer 随 fiber 回收 |
| R6 | 非破坏：不改 DSH checkout / better-sidebar / canvas 插件 | 本包自持，未触碰上述任何仓库 |

## 安装

```powershell
dsh plugin --profile web add <dsh-todo-sidebar-0.1.0.tgz>
# 或从仓库：dsh plugin --profile web add github:<owner>/dsh-todo-sidebar#<ref>
```

`--profile` 必须紧跟 `plugin` 之后。安装后刷新 `http://127.0.0.1:3080`。

## 设计要点

### 数据链：直接解析投影面，而不是用框架的 `useProjection`

`todos` 投影 key 由 `dsh-tool-todo` 注册，宿主类型 `TodoItem[] | null`，字段只有 `content` 与 `status`
（`pending | in_progress | completed`，无 id / priority）。客户端是 **push 模型**：宿主是唯一计算点，
客户端只持有成品整值，`ProjectionValueStore.faceOf(key)` 返回 **identity-stable** 的
`{ getSnapshot, subscribe }` —— 它正是 `useProjection` 的解析路径。

better-sidebar 的 tab 体**不在 DSH slot 树内**，拿不到 session 作用域的标准 props，因此改为：

```ts
ctx.get('sessions')                                  // 安全获取（不直读 Proxy）
  ?.binding(scope.sessionId)?.session.projections    // SessionBinding.session = SessionFace
  ?.faceOf('todos')                                  // ProjectionsFace
=> useSyncExternalStore(...)                         // 无本地镜像、无折叠
```

**三态必须保持区分**（`readTodos` 的契约，测试已锁定）：

| 值 | 含义 | 渲染 |
|---|---|---|
| `undefined` | 能力缺席（无会话 / 宿主单元未挂载 / 尚无 baseline） | 「任务暂不可用」 |
| `null` → `[]` | 投影存在且为空 | 空态 |
| 数组 | 真实条目 | 列表 + 进度摘要 |

把前两者混同，等于向读者宣称「这个会话没有任务」，而事实是「拿不到数据」。

### 遮蔽官方 dock：list 槽的 cell 竞争

`conversation.input.dock` 是 **list 槽**，cell 由条目的 `id` 标识。SlotCore 的行为是：

1. `register()` 判重键为 `(id, priority)` —— 同 id 换一个 priority 是合法注册；
2. 条目按 `priority` 升序（再按 `order`）排序，报错文案自带语义 "lowest renders"；
3. `entriesOfSlot()` 对 list 槽按 `options.id` 取 cell，**同 cell 只保留排序后的第一条**。

官方条目注册 `{ id: 'todo', order: 0 }`（priority 缺省 = 0），本插件以 **`{ id: 'todo', priority: -1 }** 胜出。
注册走 `ctx.slots.inject('conversation.input.dock', …)`（等待槽声明并在声明重建时重装），
而不是裸 `register`（会与父条目的 children 声明表竞态）。同一手法在 `dsh-input-traffic` 对兄弟 cell `queue`
上已是运行中的先例。

**仅在 `betterSidebar` 可用时才遮蔽**，否则藏了面板而任务无处可见。

### 承载面：DSH 原生右侧栏

0.1.5 起右侧栏归 DSH 原生所有，better-sidebar 的 `openTab` 默认 `target: 'right'` 会把内容注册为原生 tab 类型，
`+` 菜单即原生 guide 页（`description` 仅在 guide 条目 ≤4 个时渲染）。tab 体仍收到
`TabComponentProps = { ctx, store, scope, tab, visible, … }`，本插件只用其中 `ctx` / `scope` / `visible`。

`visible === false` 时不渲染正文，避免隐藏 tab 每次投影帧重渲染。

## 耦合风险与自检

| 风险 | 后果 | 自检方法 |
|---|---|---|
| 上游重命名 `todo` cell id | 遮蔽静默失效，官方面板复现（**fail-open**：数据不丢，只是重复显示） | 控制台执行 `ctx.slots.entriesOfSlot('conversation.input.dock').filter(e => e.options.id === 'todo')`，应只剩本插件的条目（`registrant: 'dsh-todo-sidebar'`、`priority: -1`） |
| better-sidebar 面板/侧栏关闭 | 任务不可见 | tab badge 显示未完成数作为线索 |
| 上游改 `todos` 投影 key 或字段 | 看板显示「不可用」或丢弃非法条目 | `dsh-tool-todo` 的 `types.d.ts` 中 `SessionProjectionMap.todos` 仍是唯一真源 |
| better-sidebar API 漂移 | 注册面失效 | 只用 `registerTab` 的基本字段（`id/title/description/icon/order/single/badge/component`）；`peerDependencies` 放宽为 `>=0.18.1`，`devDependencies` 钉当前运行版 |

## 已知缺口

- **K1** 用户在 Side 卡片里禁用本 tab 类型时，dock 仍处于隐藏态 → 任务无处可见。
  后续可 gate on `prefs.tabsEnabled`，本次不做（用户已选「完全隐藏」）。
- **K2** better-sidebar 面板/侧栏关闭时任务不可见（已确认接受）。
- **K3** 上游重命名 `todo` cell → 遮蔽静默失效（fail-open，见上表）。

## 开发

```powershell
pnpm install        # 依赖：react / @deepseek-ai/cordis 为 devDep，运行时由宿主模块表提供
pnpm typecheck      # tsc -p tsconfig.json && tsc -p tsconfig.client.json
pnpm test           # vitest（jsdom）
pnpm build          # tsc 出 lib/types + tsdown 出 lib/index.mjs / lib/client.js
npm pack            # 出 tarball（本目录有 pnpm-workspace.yaml 但无 packages 字段，pnpm pack 不可用）
```

`lib/` **必须入库**：profile 通过 GitHub ref 安装时没有构建步骤。

## 兼容性

在 **DSH 0.1.5-rc.2 + dsh-better-sidebar 0.19.1** 上逐条实测（SlotCore 实现、官方 todo dock 注册点、
投影面类型、`registerTab` 契约均已读源码取证）。`engines.dsh` 为 `>=0.1.5-rc.1 <0.2.0-0`。
