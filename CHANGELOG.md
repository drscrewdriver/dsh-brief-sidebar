# Changelog — dsh-brief-sidebar

## 0.9.26-local.2 (2026-11-16)

- **重载历史会话时产物区默认预览历史改动**（此前看起来像"没有产物"）：重开一个已结束的会话时
  「本回合改动」必然为空，而更早的改动全被折叠收起，整节只剩一个折叠标题。
  现在本回合为空 ⇒ 历史区**默认展开并预览前 5 条**，点「还有 N 条」看全量，点折叠行收起。
  本回合有产物时仍按老规矩收起（本回合才是读者要看的）。
- 修复预览态的一个渲染缺陷：收起状态下「还有 N 条」入口不再误显示（原先它按"未全展开"判断，
  收起态也会命中）。
- 折叠开关状态改为 `undefined | boolean` 覆盖值，默认值随 `latest` 变化重新求值——
  回合中途从空变为有产物时不会卡在旧状态。
- 新增 `deliverables.historyMore`（9 语）；`tests/summary-groups.spec.tsx` 增加 4 条重载语义用例。

## 0.9.26-local.1 (2026-11-15)

- **PTC 会话可见性补齐**（此前 PTC 会话的产物 / 技能 / 搜索三区全空）：`tool/ptc-dispatch`
  结算事件折入三个投影 unit，与原生 `tool/call`+`tool/result` 通道并列，同一路径/技能/查询不双计。
  真机回归：9 个真实 PTC 会话（1250 次子派发）产物 **0 → 158**（含 codeplan 13 条，plan pill 恢复点亮），双计 0。
- 搜索区：PTC 派发带 `meta`（与原生 `tool/result` 同构），`web_search`/`advanced_search` 的查询与来源都折；
  无 meta 的派发只折查询（来源 0），`advance_fetch` 不折。降级文案零改动。
- 技能区：PTC `skill` 工具调用通道补齐（用户手打的 `skill-invocation` 通道本就正常）。
- **checkpoint 重折**：三个 unit 的 `stateVersion` 升至 1 / 2 / 3——不升版本的话，已跑过 PTC 的存量会话
  的旧 checkpoint（`ver` 匹配）会被前向套用，缺口永久固化。首次打开旧会话会多一次全量重放。
- 新增 `tests/ptc-dispatch-fold.spec.ts`（25 用例：三单元 PTC 契约 + 双计守卫 + 对象入口边界 + 版本断言）。


## 0.9.25-local.7 (2026-11-11)

- **回响页签接 v7 编号模型**（配套 spirit 0.8.4-local.11：记录持 echo-<uuid>、回响持 recall-<uuid>）：
  - 行文字 = 记录标题；副行 = `echo-xxxx · 11/9 02:46 ×N`（记录时间 + echo 短号 + 被想起次数），全 UUID 只进 tooltip。
  - 行点击按 `lastRecallId` 开那一轮注入卡；兼容 v6 帧的 `refs/refId/lastEchoStepId`（旧帧仍可读）。
  - 「最近」行 = 最近一条记录 + echo 短号。

## 0.9.25-local.6 (2026-11-11)

- **「最近」行改以引用为准**：有 `refs` 时显示最近一条引用（`title`，无标题退 `memId`），不再用段落截断；无 refs 老帧仍退回段落口径。
- 新增断言：`最近：plugin-9lang-five-dim` 直接命中（防止回退成段落截断）。

## 0.9.25-local.5 (2026-11-11)

- **回响页签改记忆引用行**（配套 spirit 0.8.4-local.8 的 echo-id ≡ memid）：
  - 优先读投影 v6 的 `refs[]`：每行=一条被想起的记忆，行文字=`title`（如 `plugin-9lang-five-dim`），`×N` 为召回次数；`refId`（`echo:<kind>:<id>`）只进 tooltip，不当行文字。
  - 行点击开原文（按该行 `lastEchoStepId`）；`sessionId` 取行内值（跨会话也正确）。
  - 无 `refs` 的老帧退到 `steps` 行为（不伪装新形状）；语气 `tone` 不在侧栏展示（属于星海观测面）。
  - 新增两条断言：refs 行标题/×N/无 `echo-…`；refs 空退 steps。

## 0.9.25-local.4 (2026-11-11)

- **回响行文字改成内容优先**（用户实报：行首显示的是 `echo-…127843` 编号，期望的是 `plugin-9lang-five-dim` 这种内容，并且要能指向条目/星图）：
  - 读投影新字段 `steps[].title`（spirit 0.8.4-local.7 起提供：线程任务名 > 反馈 > 交付句 > …）作为行文字；老帧没有 title 才退回 preview。**`echo-<ts>` 不再当条目名**，只留在 tooltip 与「原文」查看里。
  - 读 `steps[].refs`（memid 引用：task/delivery/experience/memory/goal）——回响从此能挂回具体记忆条目（等价于 memid），供后续条目/星图深链使用。
  - 新增两条断言：有 title 时渲染内容名且不含 `echo-…`；无 title 老帧退回 preview 不编造。

## 0.9.25-local.3 (2026-11-10)

- **注入行被跳过挤出去时的假空态**：帧里 `steps` 只有最近 5 条，连走几轮「跳过」会把真正的注入行挤到 `lastStep`，按 `steps` 判定就会得出「本会话还没有回响段」。现在把 `lastStep` 兑回列表（去重），实测本会话从 0 行变 2 行。
- **选单改成行内锚定**：用按钮的 viewport 坐标去摆 `fixed` 弹层，实测会落到视口外（trigger(1613,926) → 弹层(1692,1730)）；改成在行包裹器内 `absolute`，不量坐标就不会错位。实机复核：popover(1474,928) 在视口内、`elementFromPoint` 命中菜单项、星图跳转成功。

## 0.9.25-local.1..2 (2026-11-10)

- **回响行级选单（与 memory 行同款）**：每条回响行右侧多一个 `查看 ▾`，展开三项：**原文**（本插件查看器 tab）/ **条目**（spirit 翻阅 → 回响）/ **星图**（spirit 星海星图）；两条跳转仍走同一条 `dsh-spirit:open-sea` 深链，回执失败时降级文案挂在触发器 title 上。行本身的点击仍直接开原文，底部两个跳转链接保留（空态需要它们）。
- **早期条目显示时间**：查看器无原文时改成「早期落档（YYYY/MM/DD HH:mm:ss）：这条当时只存了摘要、没存原文。」，不再只给一句无时间的说明。

## 0.9.23-local.1 (2026-11-10)

- **回响条目带编号，可开原文**：每行显示 `echo-…<末6位>`（完整编号 + 时间进 title），点击行 → 新开右侧栏 tab「原文查看器」，按编号向 spirit 的 `echo-detail` 取当时注入的整张卡（同会话定位；早期无原文的条目回退显示摘要）。

## 0.9.22-local.4 (2026-11-10)

- **旧数据也剥干净**：未清洗的历史摘要（`<system-reminder>` 开头、后面跟免责声明）在侧栏渲染前从第一个分段行（`状态：`/`线程：`/`想起：`…）开切，旧数据不会因为新版本重写。

## 0.9.22-local.3 (2026-11-10)

- **列表只列「真注入了什么」**：注入行保留（带摘要，最多三条），跳过行不再逐条刷屏，收成一句 `另有 N 轮未注入（门名 ×次数）`；无摘要的旧注入行不再占位。

## 0.9.22-local.2 (2026-11-10)

- **回响页签改成条目列表**：不再只列「被想起的段落」（大多数轮次为空，看起来像坏了），改为逐条列出本会话的回响：`本会话 N 条回响` + 每行 `注入 · <卡摘要>` / `跳过 · <门名>`（时间进 title），有「想起」时额外一行。
- **与记忆同一种控制**：新增 `showSpiritEcho` 开关（设置面，默认开），关掉后「回响」页签整页不出现——和「本会话召回 / 常驻槽位」两个开关同一机制。

## 0.9.22-local.1 (2026-11-10)

- **回响页签改为持久召回段**：读 `spiritEcho` 的新帧 `{token, total, segments, lastStep}`——列出**本会话被 dsh-spirit 召回过的回响段**（spirit 0.8.2 起落库，重启不归零），行内给「本会话 N 段回响 + 最近一段」，并把「上一轮：注入/跳过（门名）」单列为观测行，不再冒充回忆。
- **两个跳转**：「星图 →」直达 spirit 星海图，「条目 →」直达翻阅 → 回响；两者共用同一可取消事件 + 同步回执，失败仍给可读文案。空态也保留跳转（导航不依赖数据）。
- 九语字典同步：`echo.segmentCount` / `echo.lastStep` / `echo.gotoGraph`，并改写空态文案（不再说「重启归零」）。

## 0.9.21-local.5 (2026-11-10)

- 深链失败时把 owner 回执的 `detail`（试过哪几路布局解析 / 抛了什么）挂到失败行的 `title` 上，`data-dsh-brief-sidebar="memory-view-fail"` / `"spirit-echo-fail"` 可直接取证；`打开回响失败（unregistered）` 这类三个字的回执不再无解可查。
- 行内「查看详情 ▾ → 速览」打开旧侧栏查看器（带该行 recordId）；文档级「详细展示 ▾」保持条目/2D/3D 三项。

## 0.9.21-local.4 (2026-11-10)

- 概要 tab：「引用」新增第 4 个页签「回响」（读 `dsh-spirit` 的 `spiritEcho` 投影：本会话条数 + 最近注入/跳过门名），点「查看 →」经 `dsh-spirit:open-sea` 深链直达「记忆星海 → 翻阅 → 回响」；spirit 缺席整页隐藏，重启归零走空态文案。
- 「引用 → 记忆」的「详细展示 ▾」与行内「查看详情 ▾」都弹类型选单：速览（旧侧栏查看器）/ 条目 / 2D 图 / 3D 图；后三者经 `dsh-prime-memory:open-explorer` 深链打开记忆库整页（行内带 recordId），入口关闭/未挂载按 ack 给可读降级文案。行内选单改为 fixed 浮层，不再被行高裁掉底框。
- 九份语言字典同步补 `echo.*` / `memoryView.*`；`purity.spec` 的宿主范围断言改随现行 `engines.dsh` 区间（旧的 20 段枚举断言已与 manifest 脱钩）。

0.9.15: host enumeration addendum for DSH 0.2.1-rc.3 (declaration-only bump; contract plane zero diff).

## 0.9.14 (2026-10-18)

- hosts: 追加 0.2.1-rc.2 声明面枚举（34/34 @deepseek-ai/* 宿主 peer 逐包 npm 实测 rc.2 在版；本插件不触 ctx.web provider 与 conversation.input.model.label 槽，代码零改动，纯元数据发版；农场 rc.2 格挂账待命）

## 0.9.13 — 2026-10-17（装载判据补 0.2.1-rc.1）

- 纯清单活：`engines.dsh` 与全部 `@deepseek-ai/dsh*` peer 枚举尾加 `0.2.1-rc.1`（16 项精确枚举，禁区间/caret），由 sync-hosts 从 hosts.mjs 统一下发；代码零改动。
- `@deepseek-ai/dsh-client-locale` 纳入 `hostPeerPackages` 托管——此前它的枚举串是手工对齐的，不在 sync 写点内，属双清单同串纪律的潜在漂移陷阱。

## 0.9.12 — 2026-10-15（重启后的空 memoryId 不再伪装成错误）

- 修 `⚠️ [object Object]`：重启后 better-sidebar 会先恢复持久 tab，此时 `tab.path` 为空，旧代码仍照发 `{ids:['']}`，被服务端拒为「ids 过滤后为空」；而宿主 RPC 的失败壳是 `{ok:false, error:{code,message}}` **对象**，当字符串拼进模板就成了 `[object Object]`。现在空 id 直接走空态文案「未在本轮启动周期选择查看的记忆」，**不发请求**。
- 失败信息说人话：优先渲染 `error.message`，非 2xx 给 `HTTP <status>`，两者都拿不到才回落「未找到该记忆」。查看器唯一数据源的服务端契约同步补了用例（prime-memory `tests/records-meta.test.ts`）。

## 0.9.11 — 2026-10-15（记忆详情查看器内聚进本插件）

- **查看入口打通**：召回列表的打分行右侧与槽位的 ref 行都给出跳转按钮，点击经 `betterSidebar.openTab` 打开 `dsh-md-memory-viewer:memory` tab。**走 tab 通道，不碰文件系统**：之前伪装成 `<id>.memory` 的 fileViewer 方案会被宿主 EditorHost 当物理路径去 fsRead，永远 ENOENT。
- **查看器组件内聚**（`src/client/memory-viewer/viewer.tsx`）：独立插件 `dsh-md-memory-viewer` 退役删除，tab 类型改由本插件 `apply()` 注册（`hidden: true`，不进 + 菜单，只能由按钮程序化打开）。因此重启后 better-sidebar 恢复的持久 tab 仍有认领方，不再退化成「这类内容还没有可用的查看方式」。
- **服务引用改走模块级 `memory-tab.ts`**：深层组件里 `ctx.get('betterSidebar')` 会被 strict proxy 静默拒绝（按钮点了没反应且无报错），改为 apply 时一次性取好存闭包。
- **空态兜底**：`memoryId` 为空（重启后 tab 先于注册恢复）时显示「未在本轮启动周期选择查看的记忆」，不再留空白面板。
- **记忆正文 markdown 化**：悬停泡泡与查看器共用轻量 `renderMd`（零外部依赖：heading 层级 / 粗体 / 行内代码 / 列表），数据全部走 `dsh-memory/records-meta` API，不再读磁盘。
- **展示层级修正**：标题取记忆的 `name`并以 13px/600/主色显示，场景行降为 10px 作为从属信息——之前两者字号接近，且 `## 结论/事实` 这类正文分节被当成记忆名称顶在上面。

## 0.9.10 — 2026-10-14（搜索容量按实测抬高，并让旧会话重放）

- 搜索折叠上限重定：来源 20→**64**、查询 20→**48**、本轮 URL 桶 20→**64**（摘要 160 字、每源 5 条查询不变）。
- 依据是量出来的：本机 348 个会话（70 个含搜索）中每会话不同查询 p50=7/p90=29/p95=38/p99=67，
  不同来源 p50=16/p90=54/p95=63/p99=164，每轮来源 p50=16/p90=41/p95=51/max=65。
  旧值 20 只到 p55 —— **连中位数会话都会被截断**，那正是「返回 0 条」的来路。
- `stateVersion` 升到 2：**形状没变也必须升**。旧上限写下的 checkpoint 已经把来源丢了，
  只有被丢弃的行才会从事件流重放；不升就只修新会话，而恰恰是现在这些报 0 的老会话需要被修。
- 新增常驻预算闸：最坏填充下整帧 62,047 字节（96KB 预算内），并断言上限真的在起作用；典型会话约 15KB。
- 上限暂不进设置页：它住在 node 半，做成配置项要碰宿主 Config schema、`.volatile()` 热生效与六线设置表单，
  而且只能向前生效（调大找不回已截断的来源，除非再升一次版本号重放）。

## 0.9.9 — 2026-10-14（搜索簇默认全部收拢）

- 「搜索」页签的查询簇**默认一律折叠**，含本轮那几条：点进页签只看到一行一条查询与它真装着的条数，
  不再一进来就倒出十几条结果气泡。
- 上一版按"本轮的簇展开"处理，实测在真实会话里把读者要扫的问题清单整个埋掉了。
- 点开哪条看哪条；展开状态按查询文本记在组件里，投影来新帧不会关掉你刚打开的那组。
- 摘掉因此不再被消费的 `SearchCluster.latest` 字段——没人用的字段就是腐化源。
- 用例改钉三件事：默认全折叠、点击只开被点的那条、再点收回；链接消毒用例也改成**先点开再断言**
  （不能拿"没渲染"当成"没链接"）。

## 0.9.8 — 2026-10-14（修聚类「展开无内容」：状态形状变了，版本号必须跟着变）

- 修 0.9.7 的现场缺陷：搜索结果按查询聚类后，**组标题有数、点开却是空的**。
- 根因：投影 state 从单 `query` 串改成 `queries[]` 集合，却把 `stateVersion` 留在 0。
  宿主 `restore` 只在版本号不匹配时才丢弃 checkpoint 并从事件流重放
  （`session-projection/src/index.ts:88-92`、`:122-126`），于是旧状态被硬塞进新 schema、
  `queries` 全被默认成空 ⇒ 所有来源掉进尾部组，各查询簇成员为空。
- `stateVersion` 升到 1：旧 checkpoint 作废重放，归属关系按事件流重新折出。
- 组标题改为只报**簇内真有的条数**（不再报调用时的 `hits`），标题与内容从此不可能对不上。
- 空簇渲染成**不可点的普通行**：不再给一个点开什么都没有的箭头；未被认领的来源仍进尾部「来源 · N」，不静默丢弃。
- 新增注册侧守卫用例：钉住 `stateVersion`=1，并同时证明旧形状的行过新 schema 确会被清空——
  两件事必须同时成立，否则就是这次这个 bug 的复现条件。

## 0.9.7 — 2026-10-14（搜索结果按查询聚类折叠）

- 「搜索」页签改为**按查询聚类**：每条查询占一行可折叠标题（`查询 · 返回 N 条`），
  展开后是该查询带回的结果气泡；不再是一整列平铺气泡。
- 默认只展开**本轮**的簇，更早的收成一行。点开状态按查询文本记在组件状态里，
  投影来新帧不会把读者刚展开的那组关掉。
- 来源现在记住**所有**带回过它的查询（`queries[]`，上限 5，跨调用取并集）：
  多查询合并调用不再被错挂到最后一条查询下；同一来源会出现在它所属的每个簇里——这是事实，不是重复渲染。
- 没有已列查询认领的来源（查询超出上限、或升级前的旧帧）归入尾部「来源 · N」组，不静默丢弃。
- 旧帧兼容：state/view schema 给 `queries` 默认值，只带单个 `query` 串的旧帧在读侧被修成 `[query]`。
- 撤掉 0.9.5 加的工具名标签（数据仍写在帧里，只是不再上屏）。

## 0.9.6 — 2026-10-14（搜索页签改为结果气泡流）

- 「搜索」页签不再列查询标题、也不再打 `advanced_search`/`web_search` 工具标签，
  并去掉「查询 · N」「来源 · N」两个分组标题：每条来源画成**左对齐气泡**，与左侧对话区同一读法。
- 气泡内依次是标题（可点击链接）、站点、摘要；「本轮」标记移进气泡底部，随来源一起滚动，不会与内容分离。
- 同一来源被多次搜到时在气泡内标 `×N`（不新增语言键，计数自己会说话）。
- 折叠层不变：查询串与工具名仍写在 `dshSummarySearchRefs` 帧里，只是不再上屏，别的表面要用仍在。
- 无来源的降级说明与列表截断附注保持；链接纪律不变（仅 http/https 成锚点，带 `rel="noreferrer noopener"`）。

## 0.9.5 — 2026-10-14（搜索页签兜底宿主 web_search）

- 搜索引用除 `advanced_search` 外同时折宿主 `web_search`：模型默认走宿主那个工具，
  只追插件工具会让「明明搜过了」的会话显示空态。
- 两种参数形状都吃：`advanced_search` 的 `query`（单串）与 `web_search` 的 `queries`（数组，
  一次调用合并多条查询时逐条成行；来源数是整次调用的总数，不硬拆到每条查询）。
- 每条查询行标出回答它的工具名（不翻译：那是可以在转录里 grep 的线上标识）。
- 真会话回灌 250 个：有查询行的会话由 20 个增至 52 个，折出 472 条宿主查询行与 777 条来源行。
- 空态提示同时提到两个工具（9 语）；帧里没有 `tool`（宿主半未升级）时按 `advanced_search` 读，行不消失。

## 0.9.4 — 2026-10-14（引用节加「搜索」页签）

- 新增投影 `dshSummarySearchRefs`：只折 `advanced_search`，不折宿主 `web_search`——
  两者对读者是不同事实（一个是你装的、可配引擎与密钥的插件，一个是宿主管道）。
  查询串取 `tool/call.arguments.query`，来源取 `tool/result.meta.sources[]`；未结算或 isError 的结果不算引用。
- 「引用」节加第三个页签「搜索」，两组各自计数：「查询 · N」（附每次返回来源数）与「来源 · N」
  （标题 / 宿主 / 摘要，本轮命中的带标记）。来源 URL 是 provider 经模型回传的不可信数据，
  因此只有 http/https 渲染成链接（带 `rel="noreferrer noopener"`），其余协议退化为纯文本。
- 降级路径：老版 dsh-free-search 不发 `presentationMeta` ⇒ 查询照记、来源为 0，
  并显示「升级后可见来源」说明，而不是留个空列表让人以为搜了没结果。
  真会话回灌 250 个：20 次调用折叠出 20 条查询、0 条来源（正是该降级路径的实证）。
- 有界：来源 / 查询 / 本轮各 20 条上限，摘要再截 160 字；真数超出时页脚给会话总数。
- 页签能力变化时默认页自动落到第一个可用页签；方向键只在可用页签之间循环。9 语新增 10 键。

## 0.9.3 — 2026-10-13（技能与记忆并列成「引用」）

- 概要看板底部三节（技能引用 / 本会话召回 / 记忆槽位）合并为一个「引用」节，节内两个页签「技能」「记忆」：
  可点击切换，页签条获焦时左右方向键同样切换。窄侧栏下不再把进展与产物挤出可视区。
- 未选中页保活（`display:none` 而非卸载）：记忆页的选中行、评分 pending、历史展开态在切页后仍在。
- 两个页签各自条件化：只有一侧能力时不留“点了就空”的页签；只剩记忆一侧时默认页自动落到记忆。
  两侧都无能力（投影缺席 / 开关全关）时整节隐藏。
- 技能页省掉与页签重复的节标题（`SkillUsageSection` 新增 `hideHeader`，独立渲染默认不变）；
  记忆页保留召回与槽位各自标题——两者是不同事实，合成一节会糊掉。
- 9 语新增 3 键：`section.references`、`references.tabSkills`、`references.tabMemory`。

## 0.9.2 — 2026-10-13（技能引用补第二条通道 + 可用清单）

- 「技能引用」不再只认 `skill` 工具调用：宿主自标的 `user/message.source.kind === 'skill-invocation'`
  （用户直接点用技能，正文以 `<skill_content>` 注入，宿主还明确要求模型不要再调工具）并入同一计数。
  真会话实测 250 个里有 10 个属于「只有 invocation、没有工具调用」，此前一条都不显示。
- 新增「本会话可用」组：取自 `skill-catalog` 帧的 `entries[].name`，默认折叠只报计数。每帧按
  **整表替换**处理（宿主注释：`update` 标的是替换式重发而非首帧），不做并集，避免技能只增不减。
  已被引用的名字从可用组里减掉——一个技能不占两行。
- 空态提示改为同时说明「工具载入」与「直接点用」两条路径；9 语新增 3 个分组键。
- 投影 state 增加 `catalog`/`catalogCount`，`stateVersion` 0→1（schema 带默认值，旧 state 仍可重放）。

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
