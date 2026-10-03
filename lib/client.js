window.__ModuleLoader__.load({
	id: "dsh-brief-sidebar",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/brief/board.ts
		const STATUSES = [
			"pending",
			"in_progress",
			"completed"
		];
		/** Locale key per status. Kept here so this module owns the vocabulary. */
		const STATUS_KEY$1 = {
			pending: "status.pending",
			in_progress: "status.inProgress",
			completed: "status.completed"
		};
		/** Locale key for one status label. */
		function statusKey(status) {
			return STATUS_KEY$1[status];
		}
		/**
		* Narrow a raw projection value into a todo list.
		*
		* Three outcomes are kept apart on purpose, mirroring the store's own contract:
		* - `undefined` — the capability is ABSENT (no session, the host unit is
		*   unmounted, or no baseline/frame has carried the key yet);
		* - `[]` — the projection is present and the list is empty (`null` on the wire);
		* - a list — real entries.
		*
		* A malformed entry is dropped rather than thrown on: the projection is a
		* trusted Host value, but a shape drift must not blank the whole board.
		*
		* @param value - the raw `unknown` snapshot of the `todos` face.
		* @returns the validated list, or `undefined` when the capability is absent.
		*/
		function readTodos(value) {
			if (value === null) return [];
			if (!Array.isArray(value)) return void 0;
			const items = [];
			for (const raw of value) {
				if (raw === null || typeof raw !== "object") continue;
				const { content, status } = raw;
				if (typeof content !== "string") continue;
				if (typeof status !== "string" || !isStatus(status)) continue;
				items.push({
					content,
					status
				});
			}
			return items;
		}
		/** Whether a string is one of the three lifecycle values. */
		function isStatus(value) {
			return STATUSES.includes(value);
		}
		/** Count a todo list by status. */
		function countTodos(todos) {
			let completed = 0;
			let inProgress = 0;
			let pending = 0;
			for (const item of todos) if (item.status === "completed") completed += 1;
			else if (item.status === "in_progress") inProgress += 1;
			else pending += 1;
			return {
				total: todos.length,
				completed,
				inProgress,
				pending
			};
		}
		/** How many entries are not finished — the tab badge. */
		function unfinishedCount(todos) {
			const counts = countTodos(todos);
			return counts.inProgress + counts.pending;
		}
		/**
		* The one-line progress summary, composed from parts so no interpolation
		* machinery is needed (the locale binder is a plain key → string lookup).
		* Mirrors the official dock's own label.
		*/
		function progressLine(counts, t) {
			const parts = [`${t("status.completed")} ${counts.completed}/${counts.total}`];
			if (counts.inProgress > 0) parts.push(`${t("status.inProgress")} ${counts.inProgress}`);
			if (counts.pending > 0) parts.push(`${t("status.pending")} ${counts.pending}`);
			return parts.join(" · ");
		}
		//#endregion
		//#region src/client/use-projection.ts
		/**
		* Reading a live session projection from the client Session Controller.
		*
		* better-sidebar tab bodies are NOT rendered inside a DSH slot, so the
		* framework's `useProjection` standard prop is not available to them. The
		* equivalent face is reachable directly: the client Session Controller is a
		* cordis service on the root context, and each session binding exposes its
		* projections store (`SessionFace.projections.faceOf(key)`), which is the very
		* observable `useProjection` resolves. Since it is a bare
		* `{ getSnapshot, subscribe }` source, `useSyncExternalStore` binds it as-is —
		* no local mirror, no folding, and the value reference only changes when the
		* Host pushes a frame.
		*
		* Everything here is resolved defensively: a host without the Session
		* Controller, or a session that is not open any more, degrades to "capability
		* absent" (undefined) rather than throwing inside a render.
		*
		* This module is key-agnostic; the per-projection knowledge (which key, how to
		* narrow the raw value) lives with the feature modules that call it.
		*/
		/** A no-op unsubscribe, kept as one identity so effects never thrash. */
		const NO_SUBSCRIBE$2 = () => {};
		/** A source that never has a value — the absent-capability face. */
		const ABSENT$1 = {
			getSnapshot: () => void 0,
			subscribe: () => NO_SUBSCRIBE$2
		};
		/**
		* Whether a value really is a projection face.
		*
		* The store contract promises an identity-stable face for every key, so this
		* never fires against a healthy host. It exists because the fallback is worse
		* than the check: `useSyncExternalStore` would throw on a face-less key, and a
		* thrown render is a blank sidebar rather than a diagnosable "unavailable".
		*/
		function isFace(value) {
			if (value === null || typeof value !== "object") return false;
			const face = value;
			return typeof face.getSnapshot === "function" && typeof face.subscribe === "function";
		}
		/**
		* Resolve one projection face for one session.
		*
		* `ctx.get('sessions')` is the safe accessor (a direct `ctx.sessions` read can
		* throw on a context that does not carry the service yet).
		*
		* @param ctx - the client root context handed to the tab body.
		* @param sessionId - the tab's session scope; undefined means "no session".
		* @param key - the projection key to resolve.
		* @returns the projection face, or {@link ABSENT} when unreachable.
		*/
		function resolveFace(ctx, sessionId, key) {
			if (ctx === void 0 || sessionId === void 0) return ABSENT$1;
			const sessions = ctx.get("sessions");
			if (sessions === void 0 || typeof sessions.binding !== "function") return ABSENT$1;
			const projections = sessions.binding(sessionId)?.session?.projections;
			if (projections === void 0 || typeof projections.faceOf !== "function") return ABSENT$1;
			const face = projections.faceOf(key);
			return isFace(face) ? face : ABSENT$1;
		}
		/**
		* Read one frame of a projection without subscribing.
		*
		* The one-shot sibling of {@link useProjectionValue}, for consumers that are
		* not React components — the tab badge is a plain function called on every
		* tab-bar render, so it must neither hold a subscription nor allocate one.
		*
		* @param ctx - the client root context.
		* @param sessionId - the session whose projection is read.
		* @param key - the projection key to read.
		* @returns the raw snapshot: `undefined` while the capability is absent; the
		*   semantics of any other value belong to the projection's own contract.
		*/
		function projectionSnapshot(ctx, sessionId, key) {
			return resolveFace(ctx, sessionId, key).getSnapshot();
		}
		/**
		* Subscribe to one session projection by key.
		*
		* @param ctx - the client root context.
		* @param sessionId - the session whose projection is shown.
		* @param key - the projection key to subscribe to.
		* @returns the raw snapshot value, identity-stable across frames the host did
		*   not change. Narrowing is the caller's job.
		*/
		function useProjectionValue(ctx, sessionId, key) {
			const face = (0, react.useMemo)(() => resolveFace(ctx, sessionId, key), [
				ctx,
				sessionId,
				key
			]);
			const subscribe = (0, react.useCallback)((listener) => face.subscribe(listener), [face]);
			const getSnapshot = (0, react.useCallback)(() => face.getSnapshot(), [face]);
			return (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
		}
		//#endregion
		//#region src/client/brief/use-todos.ts
		/**
		* Reading the live `todos` projection — the thin, todo-specific wrapper around
		* the generic face resolver (`../use-projection`). The projection key is
		* registered by `dsh-tool-todo`; the host pushes finished whole values and the
		* client never folds it. Narrowing lives in `./board` (`readTodos`).
		*/
		/** The projection key registered by `dsh-tool-todo`. */
		const TODOS_KEY = "todos";
		/**
		* Subscribe to one session's todo list.
		*
		* @param ctx - the client root context.
		* @param sessionId - the session whose projection is shown.
		* @returns the list, `[]` for a present-but-empty projection, or `undefined`
		*   while the capability is absent.
		*/
		function useTodos(ctx, sessionId) {
			const raw = useProjectionValue(ctx, sessionId, TODOS_KEY);
			return (0, react.useMemo)(() => readTodos(raw), [raw]);
		}
		//#endregion
		//#region src/client/TodoBoardTab.tsx
		/**
		* The progress section: the `todos` projection drawn as one part of the
		* summary tab.
		*
		* The official composer-band panel is shadowed by this plugin (see
		* `brief/dock-shadow.tsx`), so the projection is read here and rendered as an
		* ordinary React view — no Canvas, no cross-package dependency. The full-height
		* shell and the scroll container live on the summary tab (`../SummaryTab`);
		* this component renders only its own slice and is the one section whose
		* absent state must stay VISIBLE: the official dock is hidden while this
		* plugin is mounted, so "unavailable" is a statement the reader needs.
		*
		* Colours come from `--dsw-alias-*` tokens only (skin contract), and the status
		* palette uses tokens that actually exist in the shipping theme:
		* `state-success-primary` / `state-business-primary` / `label-tertiary`.
		*/
		/** Status → token colour for the pill's text and border. */
		const STATUS_COLOR = {
			completed: "var(--dsw-alias-state-success-primary)",
			in_progress: "var(--dsw-alias-state-business-primary)",
			pending: "var(--dsw-alias-label-tertiary)"
		};
		const SECTION_STYLE$2 = {
			flexShrink: 0,
			borderBottom: "1px solid var(--dsw-alias-border-secondary)"
		};
		const HEADER_STYLE$3 = {
			padding: "10px 12px 0",
			color: "var(--dsw-alias-label-secondary)",
			fontSize: 12,
			fontWeight: 600
		};
		const PROGRESS_STYLE = {
			padding: "6px 12px 10px",
			color: "var(--dsw-alias-label-secondary)",
			fontSize: 12
		};
		const LIST_STYLE$2 = {
			listStyle: "none",
			margin: 0,
			padding: "6px 0",
			display: "flex",
			flexDirection: "column"
		};
		const ROW_STYLE$3 = {
			display: "flex",
			alignItems: "flex-start",
			gap: 8,
			padding: "6px 12px"
		};
		/** Pill style, coloured per status. */
		function pillStyle(status) {
			return {
				flexShrink: 0,
				color: STATUS_COLOR[status],
				border: `1px solid ${STATUS_COLOR[status]}`,
				borderRadius: 999,
				padding: "0 6px",
				fontSize: 11,
				lineHeight: "16px",
				whiteSpace: "nowrap"
			};
		}
		/** Task text: finished entries read as done, the working one as active. */
		function contentStyle(status) {
			return {
				minWidth: 0,
				overflowWrap: "anywhere",
				color: status === "completed" ? "var(--dsw-alias-label-tertiary)" : status === "in_progress" ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-secondary)",
				textDecoration: status === "completed" ? "line-through" : "none"
			};
		}
		/** Centred message block used by every non-list state. */
		function Notice(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					margin: "0 auto",
					padding: 24,
					maxWidth: 460,
					textAlign: "center",
					color: "var(--dsw-alias-label-tertiary)",
					lineHeight: 1.7,
					fontSize: 12
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						marginBottom: 6,
						color: "var(--dsw-alias-label-secondary)"
					},
					children: props.title
				}), props.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: props.detail })]
			});
		}
		/** One task row. */
		function TodoRow(props) {
			const { item, t } = props;
			return (0, react.createElement)("li", { style: ROW_STYLE$3 }, (0, react.createElement)("span", { style: pillStyle(item.status) }, t(statusKey(item.status))), (0, react.createElement)("span", { style: contentStyle(item.status) }, item.content));
		}
		/**
		* The progress section. The subscription is unconditional (a plain listener,
		* not IO); the three-state contract of the projection is preserved verbatim.
		* @param props - translation, client context, session scope.
		*/
		function TodoSection(props) {
			const { t, ctx, scope } = props;
			const todos = useTodos(ctx, scope?.sessionId);
			if (todos === void 0) return (0, react.createElement)("div", {
				style: SECTION_STYLE$2,
				"data-dsh-brief-sidebar": "progress-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE$3 }, t("section.progress")), (0, react.createElement)(Notice, {
				title: t("board.unavailable"),
				detail: t("board.unavailableHint")
			}));
			if (todos.length === 0) return (0, react.createElement)("div", {
				style: SECTION_STYLE$2,
				"data-dsh-brief-sidebar": "progress-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE$3 }, t("section.progress")), (0, react.createElement)(Notice, {
				title: t("board.empty"),
				detail: t("board.emptyHint")
			}));
			const counts = countTodos(todos);
			return (0, react.createElement)("div", {
				style: SECTION_STYLE$2,
				"data-dsh-brief-sidebar": "progress-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE$3 }, t("section.progress")), (0, react.createElement)("div", { style: PROGRESS_STYLE }, progressLine(counts, t)), (0, react.createElement)("ul", { style: LIST_STYLE$2 }, todos.map((item, index) => (0, react.createElement)(TodoRow, {
				key: `${index}:${item.content}`,
				item,
				t
			}))));
		}
		//#endregion
		//#region src/projection/keys.ts
		/**
		* The projection key this plugin contributes to the session-projection
		* registry, and its wire view.
		*
		* The key is namespaced with the plugin name on purpose: the registry refuses
		* to share a key across differing `stateVersion`s, so a collision with a
		* future host-side deliverables unit would be a hard load error, not a silent
		* shadow. The view type is declared structurally (the plugin has no compile
		* dependency on `@deepseek-ai/dsh-session-projection`); the registry accepts
		* any string key at runtime.
		*/
		/** The projection key registered by this plugin's host half. */
		const DELIVERABLES_KEY = "dshSummaryDeliverables";
		//#endregion
		//#region src/client/file-open.ts
		/** The address scheme every file resource opens with. */
		const FILE_ADDRESS_PREFIX = "dsh-resource://file/";
		/** Whether a path uses a Windows drive or UNC prefix. */
		function isWindowsStylePath(value) {
			return /^[A-Za-z]:[/\\]/.test(value) || value.startsWith("\\\\");
		}
		/**
		* Whether a path is absolute in either spelling the Host accepts: POSIX (`/a/b`)
		* or Windows drive or UNC.
		*/
		function isAbsoluteWorkspacePath(path) {
			return path.startsWith("/") || isWindowsStylePath(path);
		}
		/** Component-encode one id or path segment, keeping `:` literal for drive letters. */
		function encodeSegment(segment) {
			return encodeURIComponent(segment).replace(/%3A/gi, ":");
		}
		/** Encode a `/`-separated path segment by segment. */
		function encodePath(path) {
			return path.split("/").map(encodeSegment).join("/");
		}
		/**
		* Build the address of a file read through one Session.
		* @param sessionId - the Session whose Host workspace resolves the path.
		* @param path - absolute or workspace-relative path; backslashes are normalized
		*   to `/`, and leading `./` prefixes are dropped.
		*/
		function sessionFileAddress(sessionId, path) {
			const normalized = path.replace(/\\/g, "/").replace(/^(?:\.\/)+/, "");
			return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodePath(normalized)}`;
		}
		/**
		* The address for a path as a caller holds it.
		* @param sessionId - the Session the path is read in.
		* @param cwd - that Session's workspace root, when known.
		* @param path - absolute or workspace-relative path, in either separator spelling.
		*/
		function fileAddressFor(sessionId, cwd, path) {
			const normalized = path.replace(/\\/g, "/");
			if (!isAbsoluteWorkspacePath(normalized)) return sessionFileAddress(sessionId, normalized);
			const root = cwd === void 0 ? "" : cwd.replace(/\\/g, "/").replace(/\/+$/, "");
			if (root !== "" && normalized === root) return sessionFileAddress(sessionId, "");
			if (root !== "" && normalized.startsWith(`${root}/`)) return sessionFileAddress(sessionId, normalized.slice(root.length + 1));
			return sessionFileAddress(sessionId, normalized);
		}
		/**
		* Build a sidebar file opener for one session, or `undefined` when the
		* environment cannot open previews (no `sidebarRight` service, no session).
		* The cwd is re-read per call inside the opener, so a workspace switch between
		* renders is picked up on the next click.
		*
		* @param ctx - the client root context.
		* @param sessionId - the session whose workspace resolves paths.
		* @returns an opener that routes a produced path to the Sidebar preview.
		*/
		function sidebarFileOpener(ctx, sessionId) {
			if (ctx === void 0 || sessionId === void 0) return void 0;
			const bar = ctx.get("sidebarRight");
			if (bar === void 0 || typeof bar.openResource !== "function") return void 0;
			return (path) => {
				const cwd = ctx.get("sessions")?.list?.getSnapshot?.().byId?.[sessionId]?.cwd;
				bar.openResource(fileAddressFor(sessionId, cwd, path));
			};
		}
		//#endregion
		//#region src/client/summary/deliverables.ts
		/**
		* Narrow a raw projection value into a deliverables view.
		*
		* Two outcomes are kept apart on purpose, mirroring the store's contract:
		* - `undefined` — the capability is ABSENT (the host half never registered —
		*   e.g. an older composition — or no frame carried the key yet);
		* - a view — the projection is live. A view with `latest: null` and
		*   `sessionTotal: 0` IS the empty state; the fold starts publishing as soon
		*   as the unit registers, so "present but empty" is a real value here, not a
		*   sentinel.
		*
		* @param value - the raw `unknown` snapshot of the deliverables face.
		* @returns the validated view, or `undefined` when the capability is absent.
		*/
		function readDeliverables(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
			const raw = value;
			if (raw.latest === void 0 || raw.sessionPaths === void 0 || raw.sessionTotal === void 0) return;
			if (!isBucket(raw.latest) || !Array.isArray(raw.sessionPaths) || typeof raw.sessionTotal !== "number") return;
			const paths = raw.sessionPaths.filter((path) => typeof path === "string");
			return {
				latest: raw.latest === null ? null : {
					turn: raw.latest.turn,
					paths: raw.latest.paths
				},
				sessionPaths: paths,
				sessionTotal: raw.sessionTotal
			};
		}
		/** Whether a value is a well-formed latest-turn bucket (or explicitly null). */
		function isBucket(value) {
			if (value === null) return true;
			if (typeof value !== "object") return false;
			const bucket = value;
			return typeof bucket.turn === "number" && Array.isArray(bucket.paths);
		}
		/**
		* The path prefix that identifies a codeplan artifact. The codeplan skill
		* writes its four fixed artifacts under `$workspace\.agents\plans\<任务名>\`;
		* produced paths may spell the separators either way.
		*/
		const CODEPLAN_SEGMENT = ".agents/plans/";
		/**
		* Normalize path separators so one spelling of the codeplan prefix matches.
		* Only classification uses this; the displayed path keeps the tool's exact
		* spelling.
		*/
		function normalized(path) {
			return path.replaceAll("\\", "/");
		}
		/**
		* Split a codeplan path into its task name and file name.
		*
		* @param path - a produced path; need not actually be a codeplan artifact.
		* @returns task and file names, or `null` when the path is not under the
		*   codeplan plans directory (or names no file beneath the task folder).
		*/
		function splitCodeplanPath(path) {
			const marker = normalized(path).indexOf(CODEPLAN_SEGMENT);
			if (marker < 0) return null;
			const rest = normalized(path).slice(marker + 14);
			const slash = rest.indexOf("/");
			if (slash <= 0 || slash === rest.length - 1) return null;
			return {
				task: rest.slice(0, slash),
				file: rest.slice(slash + 1)
			};
		}
		/** The final path segment, under either separator. */
		function basename(path) {
			const normalizedPath = normalized(path);
			const slash = normalizedPath.lastIndexOf("/");
			return slash < 0 ? normalizedPath : normalizedPath.slice(slash + 1);
		}
		/**
		* 历史文件 = 全会话去重路径 − 本回合活跃路径。
		*
		* 分隔符归一化后比较(`a\b` 与 `a/b` 视为同一路径),保持 sessionPaths 自带的
		* "最近在前"顺序;活跃路径一个都不出现——分层契约:活跃的已在上方列表里,
		* 折叠区只收"更早改过的文件"。
		*/
		function historyPaths(sessionPaths, latestPaths) {
			const active = new Set(latestPaths.map(normalized));
			return sessionPaths.filter((path) => !active.has(normalized(path)));
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Plugin-owned i18n dictionaries.
		*
		* Consumer plugins must NOT reach into better-sidebar's internal `t()` or its
		* `betterSidebar` dictionary namespace, so this plugin registers its own
		* namespace through the DSH `locale` service. `dsh-brief-sidebar` is outside the
		* `LocaleNamespaceMap` merge table, which is exactly what the untyped
		* `register(ns, dicts)` overload is for — but the dictionaries themselves stay
		* strictly paired: `zh` is the key-set source of truth and every other language
		* (`en`, plus the fr/de/it/ru/es pack) is typed as
		* `Record<keyof typeof zh, string>`, so a missing or extra key is a COMPILE
		* error rather than a runtime fallback to the raw key.
		*
		* Every key referenced anywhere in `src/**` must exist in both dictionaries;
		* `tests/purity.spec.ts` asserts that, so a typo in a `t('…')` call cannot
		* ship as an untranslated literal.
		*/
		/** The namespace owned by this plugin (own vocabulary, own lifecycle). */
		const NS = "dsh-brief-sidebar";
		/**
		* All locales in the shape the locale service consumes. Registered in ONE call:
		* the registry rejects a duplicate `(namespace, locale)` pair and the
		* per-locale form would leave a half-registered namespace if a later call
		* threw. `zh`/`en` are the host built-ins; the fr/de/it/ru/es pack rides the
		* same map form (every id is a valid BCP 47-style tag, so the registry accepts
		* it as-is).
		*/
		const dictionaries = {
			zh: {
				"tab.title": "概要",
				"tab.desc": "当前会话的任务、产物与规划文件（只读）",
				"section.progress": "进展",
				"section.deliverables": "产物",
				"board.empty": "当前没有任务",
				"board.emptyHint": "模型调用 todo_write 之后，任务会出现在这里。",
				"board.unavailable": "任务暂不可用",
				"board.unavailableHint": "这个会话还没有收到 todo 数据；宿主推来第一帧后会自动显示。",
				"status.pending": "待处理",
				"status.inProgress": "进行中",
				"status.completed": "已完成",
				"deliverables.empty": "本回合暂无改动文件",
				"deliverables.emptyHint": "会话里成功写入或修改文件后，它们会实时出现在这里。",
				"deliverables.history": "更早改动的文件 · {count}",
				"deliverable.codeplanTag": "规划",
				"section.memorySlots": "记忆",
				"slots.empty": "当前没有激活的记忆槽位",
				"slots.emptyHint": "当 dsh-prime-memory 激活记忆槽位后，它们会实时出现在这里。",
				"slots.openCount": "开启 {count} 个槽位",
				"slots.status.open": "生效中",
				"slots.status.done": "已完成",
				"slots.status.dropped": "已弃置",
				"slots.status.expired": "已过期",
				"settings.title": "概要侧栏",
				"settings.desc": "右侧栏概要 tab 的分区开关（只读展示）。",
				"settings.memorySlots": "记忆槽位分区",
				"settings.memorySlotsHint": "开启后，概要 tab 在进展与产物之下显示 dsh-prime-memory 的激活记忆槽位（只读）。",
				"settings.unavailable": "配置面不可用，记忆分区按默认「开」处理。",
				"settings.readonly": "当前配置只读，无法在此修改。"
			},
			en: {
				"tab.title": "Summary",
				"tab.desc": "Tasks, produced files and plan artifacts of this session (read-only)",
				"section.progress": "Progress",
				"section.deliverables": "Produced files",
				"board.empty": "No tasks yet",
				"board.emptyHint": "Tasks show up here once the model calls todo_write.",
				"board.unavailable": "Tasks unavailable",
				"board.unavailableHint": "This session has not received any todo data yet; the board fills in on the first frame.",
				"status.pending": "Pending",
				"status.inProgress": "In progress",
				"status.completed": "Done",
				"deliverables.empty": "No files changed in this turn",
				"deliverables.emptyHint": "Files written or edited successfully in the session appear here live.",
				"deliverables.history": "Earlier changes · {count}",
				"deliverable.codeplanTag": "Plan",
				"section.memorySlots": "Memory",
				"slots.empty": "No active memory slots",
				"slots.emptyHint": "Slots appear here live once dsh-prime-memory activates them.",
				"slots.openCount": "{count} slots open",
				"slots.status.open": "Open",
				"slots.status.done": "Done",
				"slots.status.dropped": "Dropped",
				"slots.status.expired": "Expired",
				"settings.title": "Brief sidebar",
				"settings.desc": "Section switches for the summary tab in the right sidebar (read-only views).",
				"settings.memorySlots": "Memory slots section",
				"settings.memorySlotsHint": "When on, the summary tab lists the active memory slots from dsh-prime-memory beneath progress and produced files (read-only).",
				"settings.unavailable": "The config face is unavailable; the memory section falls back to its default (on).",
				"settings.readonly": "This config is read-only here; edits are not available."
			},
			ja: {
				"tab.title": "概要",
				"tab.desc": "このセッションのタスク・成果物・計画ファイル（読み取り専用）",
				"section.progress": "進行状況",
				"section.deliverables": "成果物",
				"board.empty": "現在タスクはありません",
				"board.emptyHint": "モデルが todo_write を呼び出すと、タスクがここに表示されます。",
				"board.unavailable": "タスクを利用できません",
				"board.unavailableHint": "このセッションはまだ todo データを受信していません。ホストが最初のフレームを送ると自動的に表示されます。",
				"status.pending": "未対応",
				"status.inProgress": "進行中",
				"status.completed": "完了",
				"deliverables.empty": "このターンで変更されたファイルはありません",
				"deliverables.emptyHint": "セッションでファイルの書き込み・変更が成功すると、ここにリアルタイムで表示されます。",
				"deliverables.history": "以前の変更 · {count}",
				"deliverable.codeplanTag": "計画",
				"section.memorySlots": "メモリ",
				"slots.empty": "アクティブなメモリスロットはありません",
				"slots.emptyHint": "dsh-prime-memory がスロットをアクティブにすると、ここにリアルタイムで表示されます。",
				"slots.openCount": "有効なスロット: {count} 件",
				"slots.status.open": "有効",
				"slots.status.done": "完了",
				"slots.status.dropped": "破棄",
				"slots.status.expired": "期限切れ",
				"settings.title": "概要サイドバー",
				"settings.desc": "右サイドバー概要タブのセクション表示切り替え（読み取り専用）。",
				"settings.memorySlots": "メモリスロットセクション",
				"settings.memorySlotsHint": "オンにすると、概要タブの進行状況と成果物の下に dsh-prime-memory のアクティブなメモリスロット（読み取り専用）が表示されます。",
				"settings.unavailable": "設定画面を利用できません。メモリセクションは既定（オン）で動作します。",
				"settings.readonly": "この設定はここでは読み取り専用のため変更できません。"
			},
			ko: {
				"tab.title": "요약",
				"tab.desc": "현재 세션의 작업, 산출물 및 계획 파일(읽기 전용)",
				"section.progress": "진행 상황",
				"section.deliverables": "산출물",
				"board.empty": "현재 작업이 없습니다",
				"board.emptyHint": "모델이 todo_write를 호출하면 작업이 여기에 표시됩니다.",
				"board.unavailable": "작업을 사용할 수 없습니다",
				"board.unavailableHint": "이 세션은 아직 todo 데이터를 받지 못했습니다. 호스트가 첫 프레임을 보내면 자동으로 표시됩니다.",
				"status.pending": "대기 중",
				"status.inProgress": "진행 중",
				"status.completed": "완료",
				"deliverables.empty": "이번 턴에 변경된 파일이 없습니다",
				"deliverables.emptyHint": "세션에서 파일을 성공적으로 작성하거나 수정하면 여기에 실시간으로 표시됩니다.",
				"deliverables.history": "이전 변경 사항 · {count}",
				"deliverable.codeplanTag": "계획",
				"section.memorySlots": "메모리",
				"slots.empty": "활성화된 메모리 슬롯이 없습니다",
				"slots.emptyHint": "dsh-prime-memory가 슬롯을 활성화하면 여기에 실시간으로 표시됩니다.",
				"slots.openCount": "열린 슬롯: {count}개",
				"slots.status.open": "활성",
				"slots.status.done": "완료",
				"slots.status.dropped": "폐기",
				"slots.status.expired": "만료",
				"settings.title": "요약 사이드바",
				"settings.desc": "오른쪽 사이드바 요약 탭의 섹션 표시 전환(읽기 전용).",
				"settings.memorySlots": "메모리 슬롯 섹션",
				"settings.memorySlotsHint": "켜면 요약 탭의 진행 상황과 산출물 아래에 dsh-prime-memory의 활성 메모리 슬롯(읽기 전용)이 표시됩니다.",
				"settings.unavailable": "설정 화면을 사용할 수 없어 메모리 섹션은 기본값(켜짐)으로 동작합니다.",
				"settings.readonly": "이 설정은 여기서 읽기 전용이므로 변경할 수 없습니다."
			},
			fr: {
				"tab.title": "Résumé",
				"tab.desc": "Tâches, fichiers produits et plans de la session (lecture seule)",
				"section.progress": "Avancement",
				"section.deliverables": "Fichiers produits",
				"board.empty": "Aucune tâche pour le moment",
				"board.emptyHint": "Les tâches apparaissent ici dès que le modèle appelle todo_write.",
				"board.unavailable": "Tâches indisponibles",
				"board.unavailableHint": "Cette session n’a pas encore reçu de données todo ; le tableau se remplit dès la première trame.",
				"status.pending": "En attente",
				"status.inProgress": "En cours",
				"status.completed": "Terminé",
				"deliverables.empty": "Aucun fichier modifié à ce tour",
				"deliverables.emptyHint": "Les fichiers écrits ou modifiés dans la session apparaissent ici en direct.",
				"deliverables.history": "Modifications antérieures · {count}",
				"deliverable.codeplanTag": "Plan",
				"section.memorySlots": "Mémoire",
				"slots.empty": "Aucun emplacement mémoire actif",
				"slots.emptyHint": "Les emplacements apparaissent ici en direct dès que dsh-prime-memory les active.",
				"slots.openCount": "{count} emplacements ouverts",
				"slots.status.open": "Actif",
				"slots.status.done": "Terminé",
				"slots.status.dropped": "Abandonné",
				"slots.status.expired": "Expiré",
				"settings.title": "Barre latérale Résumé",
				"settings.desc": "Interrupteurs des sections de l’onglet Résumé de la barre latérale (lecture seule).",
				"settings.memorySlots": "Section des emplacements mémoire",
				"settings.memorySlotsHint": "Une fois activé, l’onglet Résumé liste les emplacements mémoire actifs de dsh-prime-memory sous l’avancement et les fichiers produits (lecture seule).",
				"settings.unavailable": "Le canal de configuration est indisponible ; la section mémoire revient à sa valeur par défaut (activée).",
				"settings.readonly": "Cette configuration est en lecture seule ici ; aucune modification possible."
			},
			de: {
				"tab.title": "Übersicht",
				"tab.desc": "Aufgaben, erzeugte Dateien und Pläne dieser Sitzung (schreibgeschützt)",
				"section.progress": "Fortschritt",
				"section.deliverables": "Erzeugte Dateien",
				"board.empty": "Noch keine Aufgaben",
				"board.emptyHint": "Aufgaben erscheinen hier, sobald das Modell todo_write aufruft.",
				"board.unavailable": "Aufgaben nicht verfügbar",
				"board.unavailableHint": "Diese Sitzung hat noch keine Todo-Daten erhalten; das Board füllt sich mit dem ersten Frame.",
				"status.pending": "Ausstehend",
				"status.inProgress": "In Bearbeitung",
				"status.completed": "Fertig",
				"deliverables.empty": "Keine Dateien in diesem Durchgang geändert",
				"deliverables.emptyHint": "In der Sitzung erfolgreich geschriebene oder geänderte Dateien erscheinen hier live.",
				"deliverables.history": "Frühere Änderungen · {count}",
				"deliverable.codeplanTag": "Plan",
				"section.memorySlots": "Gedächtnis",
				"slots.empty": "Keine aktiven Speicherplätze",
				"slots.emptyHint": "Sobald dsh-prime-memory Slots aktiviert, erscheinen sie hier in Echtzeit.",
				"slots.openCount": "{count} Slots offen",
				"slots.status.open": "Offen",
				"slots.status.done": "Erledigt",
				"slots.status.dropped": "Verworfen",
				"slots.status.expired": "Abgelaufen",
				"settings.title": "Übersicht-Seitenleiste",
				"settings.desc": "Schalter für die Abschnitte des Übersicht-Tabs in der rechten Seitenleiste (schreibgeschützt).",
				"settings.memorySlots": "Speicherplätze-Abschnitt",
				"settings.memorySlotsHint": "Ist der Schalter eingeschaltet, listet der Übersicht-Tab die aktiven Speicherplätze aus dsh-prime-memory unter Fortschritt und erzeugten Dateien auf (schreibgeschützt).",
				"settings.unavailable": "Die Konfigurationsoberfläche ist nicht verfügbar; der Gedächtnis-Abschnitt fällt auf den Standard (ein) zurück.",
				"settings.readonly": "Diese Konfiguration ist hier schreibgeschützt; Änderungen sind nicht möglich."
			},
			it: {
				"tab.title": "Riepilogo",
				"tab.desc": "Attività, file prodotti e piani di questa sessione (sola lettura)",
				"section.progress": "Avanzamento",
				"section.deliverables": "File prodotti",
				"board.empty": "Nessuna attività per ora",
				"board.emptyHint": "Le attività appaiono qui quando il modello chiama todo_write.",
				"board.unavailable": "Attività non disponibili",
				"board.unavailableHint": "Questa sessione non ha ancora ricevuto dati todo; la bacheca si riempirà al primo frame.",
				"status.pending": "In attesa",
				"status.inProgress": "In corso",
				"status.completed": "Completato",
				"deliverables.empty": "Nessun file modificato in questo turno",
				"deliverables.emptyHint": "I file scritti o modificati nella sessione appaiono qui in tempo reale.",
				"deliverables.history": "Modifiche precedenti · {count}",
				"deliverable.codeplanTag": "Piano",
				"section.memorySlots": "Memoria",
				"slots.empty": "Nessuno slot di memoria attivo",
				"slots.emptyHint": "Gli slot appaiono qui in tempo reale quando dsh-prime-memory li attiva.",
				"slots.openCount": "{count} slot aperti",
				"slots.status.open": "Attivo",
				"slots.status.done": "Completato",
				"slots.status.dropped": "Scartato",
				"slots.status.expired": "Scaduto",
				"settings.title": "Barra laterale Riepilogo",
				"settings.desc": "Interruttori delle sezioni della scheda Riepilogo nella barra laterale destra (sola lettura).",
				"settings.memorySlots": "Sezione slot di memoria",
				"settings.memorySlotsHint": "Quando attivo, la scheda Riepilogo elenca gli slot di memoria attivi di dsh-prime-memory sotto avanzamento e file prodotti (sola lettura).",
				"settings.unavailable": "La superficie di configurazione non è disponibile; la sezione memoria torna al valore predefinito (attivo).",
				"settings.readonly": "Questa configurazione è in sola lettura qui; non è possibile modificarla."
			},
			ru: {
				"tab.title": "Сводка",
				"tab.desc": "Задачи, созданные файлы и планы этой сессии (только чтение)",
				"section.progress": "Ход работы",
				"section.deliverables": "Созданные файлы",
				"board.empty": "Задач пока нет",
				"board.emptyHint": "Задачи появятся здесь, когда модель вызовет todo_write.",
				"board.unavailable": "Задачи недоступны",
				"board.unavailableHint": "Эта сессия ещё не получила данные todo; доска заполнится после первого кадра.",
				"status.pending": "Ожидает",
				"status.inProgress": "В работе",
				"status.completed": "Готово",
				"deliverables.empty": "За этот ход файлы не менялись",
				"deliverables.emptyHint": "Успешно записанные или изменённые файлы появляются здесь в реальном времени.",
				"deliverables.history": "Более ранние изменения · {count}",
				"deliverable.codeplanTag": "План",
				"section.memorySlots": "Память",
				"slots.empty": "Активных слотов памяти нет",
				"slots.emptyHint": "Как только dsh-prime-memory активирует слоты, они появляются здесь в реальном времени.",
				"slots.openCount": "Открытых слотов: {count}",
				"slots.status.open": "Активен",
				"slots.status.done": "Завершён",
				"slots.status.dropped": "Отброшен",
				"slots.status.expired": "Истёк",
				"settings.title": "Боковая панель «Сводка»",
				"settings.desc": "Переключатели разделов вкладки «Сводка» на правой панели (только чтение).",
				"settings.memorySlots": "Раздел слотов памяти",
				"settings.memorySlotsHint": "Когда включено, вкладка «Сводка» показывает активные слоты памяти из dsh-prime-memory под ходом работы и созданными файлами (только чтение).",
				"settings.unavailable": "Панель конфигурации недоступна; раздел памяти работает по умолчанию (включён).",
				"settings.readonly": "Эта конфигурация здесь только для чтения; изменить её нельзя."
			},
			es: {
				"tab.title": "Resumen",
				"tab.desc": "Tareas, archivos generados y planes de esta sesión (solo lectura)",
				"section.progress": "Avance",
				"section.deliverables": "Archivos generados",
				"board.empty": "Aún no hay tareas",
				"board.emptyHint": "Las tareas aparecen aquí cuando el modelo llama a todo_write.",
				"board.unavailable": "Tareas no disponibles",
				"board.unavailableHint": "Esta sesión aún no ha recibido datos de tareas; el tablero se llena con el primer fotograma.",
				"status.pending": "Pendiente",
				"status.inProgress": "En curso",
				"status.completed": "Hecho",
				"deliverables.empty": "Ningún archivo modificado en este turno",
				"deliverables.emptyHint": "Los archivos escritos o editados en la sesión aparecen aquí en directo.",
				"deliverables.history": "Cambios anteriores · {count}",
				"deliverable.codeplanTag": "Plan",
				"section.memorySlots": "Memoria",
				"slots.empty": "No hay ranuras de memoria activas",
				"slots.emptyHint": "Las ranuras aparecen aquí en directo en cuanto dsh-prime-memory las active.",
				"slots.openCount": "{count} ranuras abiertas",
				"slots.status.open": "Activa",
				"slots.status.done": "Hecha",
				"slots.status.dropped": "Descartada",
				"slots.status.expired": "Caducada",
				"settings.title": "Barra lateral Resumen",
				"settings.desc": "Interruptores de las secciones de la pestaña Resumen en la barra lateral derecha (solo lectura).",
				"settings.memorySlots": "Sección de ranuras de memoria",
				"settings.memorySlotsHint": "Al activarla, la pestaña Resumen enumera las ranuras de memoria activas de dsh-prime-memory bajo el avance y los archivos generados (solo lectura).",
				"settings.unavailable": "La superficie de configuración no está disponible; la sección de memoria vuelve a su valor por defecto (activada).",
				"settings.readonly": "Esta configuración es de solo lectura aquí; no se puede modificar."
			}
		};
		/**
		* Expand the one `{count}` placeholder the deliverables totals line uses. The
		* locale binder is a plain key → string lookup (no interpolation machinery),
		* mirroring how `progressLine` composes its summary from parts.
		*/
		function expandCount(template, count) {
			return template.replace("{count}", String(count));
		}
		//#endregion
		//#region src/client/summary/DeliverablesSection.tsx
		/**
		* The deliverables section: the `dshSummaryDeliverables` projection drawn as
		* one part of the summary tab.
		*
		* Unlike the progress section this is an OPTIONAL capability: where the host
		* half never registered the unit (older composition, key absent), the section
		* hides entirely — absence is not an error state here, and the official
		* "本次产出" row in the conversation flow still covers the turn-end view.
		* When the projection is live, the latest turn's produced paths update
		* mid-turn: every successful mutation result publishes a frame, so the reader
		* sees files appear while the turn is still running, which is exactly the gap
		* the official turn-tail row has.
		*
		* Codeplan artifacts (paths under `.agents/plans/<任务名>/`) are ordinary
		* produced entries — they are marked with a pill, not split into a separate
		* section.
		*
		* Colours come from `--dsw-alias-*` tokens only (skin contract).
		*/
		const SECTION_STYLE$1 = {
			flexShrink: 0,
			borderBottom: "1px solid var(--dsw-alias-border-secondary)"
		};
		const HEADER_STYLE$2 = {
			padding: "10px 12px 0",
			color: "var(--dsw-alias-label-secondary)",
			fontSize: 12,
			fontWeight: 600
		};
		const LIST_STYLE$1 = {
			listStyle: "none",
			margin: 0,
			padding: "6px 0",
			display: "flex",
			flexDirection: "column"
		};
		const ROW_STYLE$2 = {
			display: "flex",
			alignItems: "flex-start",
			gap: 8,
			padding: "6px 12px"
		};
		/** 折叠区开关行:与文件行同宽,tertiary 强调,整行可点。 */
		const HISTORY_TOGGLE_STYLE = {
			background: "none",
			border: "none",
			font: "inherit",
			fontSize: 12,
			color: "var(--dsw-alias-label-tertiary)",
			cursor: "pointer",
			display: "flex",
			alignItems: "center",
			gap: 4,
			padding: "6px 12px",
			textAlign: "left",
			width: "calc(100% - 24px)"
		};
		const CHEVRON_STYLE$1 = (open) => ({
			flexShrink: 0,
			transition: "transform 0.16s",
			transform: open ? "rotate(180deg)" : "none"
		});
		const PATH_STYLE = {
			minWidth: 0,
			overflowWrap: "anywhere",
			color: "var(--dsw-alias-label-secondary)"
		};
		/** Row-as-button reset: the row itself is the click target, content unchanged. */
		const BUTTON_STYLE = {
			...PATH_STYLE,
			background: "none",
			border: "none",
			font: "inherit",
			fontSize: "inherit",
			color: "var(--dsw-alias-label-secondary)",
			padding: 0,
			textAlign: "left",
			cursor: "pointer"
		};
		/** The codeplan pill: same form as the status pills, tertiary emphasis. */
		const TAG_STYLE = {
			flexShrink: 0,
			color: "var(--dsw-alias-label-tertiary)",
			border: "1px solid var(--dsw-alias-label-tertiary)",
			borderRadius: 999,
			padding: "0 6px",
			fontSize: 11,
			lineHeight: "16px",
			whiteSpace: "nowrap"
		};
		/**
		* One produced-file row. When the sidebar opener is available the row is a
		* button that routes the path to the Sidebar preview (the same channel the
		* conversation's produced-file chips use); otherwise it degrades to a plain
		* span. A codeplan artifact carries the pill either way.
		*/
		function PathRow(props) {
			const { path, t, open } = props;
			const plan = splitCodeplanPath(path);
			const title = plan === null ? path : `${t("deliverable.codeplanTag")}: ${plan.task} · ${path}`;
			const label = basename(path);
			const content = plan === null ? null : (0, react.createElement)("span", { style: TAG_STYLE }, t("deliverable.codeplanTag"));
			if (open === void 0) return (0, react.createElement)("li", { style: ROW_STYLE$2 }, content, (0, react.createElement)("span", {
				style: PATH_STYLE,
				title
			}, label));
			return (0, react.createElement)("li", { style: ROW_STYLE$2 }, content, (0, react.createElement)("button", {
				style: BUTTON_STYLE,
				title,
				onClick: () => {
					open(path);
				}
			}, label));
		}
		/**
		* The deliverables section. The subscription is unconditional (a plain
		* listener, not IO).
		*
		* 分层:活跃文件(本回合 latest)直接列表;全会话更早改动折叠在开关行后面
		* (与活跃文件按归一化路径去重),展开后是与活跃区相同的可点击文件行。
		* @param props - translation, client context, session scope.
		*/
		function DeliverablesSection(props) {
			const { t, ctx, scope } = props;
			const [historyOpen, setHistoryOpen] = (0, react.useState)(false);
			const view = readDeliverables(useProjectionValue(ctx, scope?.sessionId, DELIVERABLES_KEY));
			if (view === void 0) return null;
			const open = sidebarFileOpener(ctx, scope?.sessionId);
			const latestPaths = view.latest?.paths ?? [];
			const history = historyPaths(view.sessionPaths, latestPaths);
			if (latestPaths.length === 0 && view.sessionTotal === 0) return (0, react.createElement)("div", {
				style: SECTION_STYLE$1,
				"data-dsh-brief-sidebar": "deliverables-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE$2 }, t("section.deliverables")), (0, react.createElement)("div", { style: {
				margin: "0 auto",
				padding: 24,
				maxWidth: 460,
				textAlign: "center",
				color: "var(--dsw-alias-label-tertiary)",
				lineHeight: 1.7,
				fontSize: 12
			} }, (0, react.createElement)("div", { style: {
				marginBottom: 6,
				color: "var(--dsw-alias-label-secondary)"
			} }, t("deliverables.empty")), (0, react.createElement)("div", null, t("deliverables.emptyHint"))));
			return (0, react.createElement)("div", {
				style: SECTION_STYLE$1,
				"data-dsh-brief-sidebar": "deliverables-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE$2 }, t("section.deliverables")), (0, react.createElement)("ul", { style: LIST_STYLE$1 }, latestPaths.map((path) => (0, react.createElement)(PathRow, {
				key: path,
				path,
				t,
				open
			}))), history.length > 0 && (0, react.createElement)("button", {
				type: "button",
				"aria-expanded": historyOpen,
				style: HISTORY_TOGGLE_STYLE,
				onClick: () => {
					setHistoryOpen((current) => !current);
				}
			}, expandCount(t("deliverables.history"), history.length), (0, react.createElement)("svg", {
				width: 10,
				height: 10,
				viewBox: "0 0 16 16",
				"aria-hidden": true,
				style: CHEVRON_STYLE$1(historyOpen)
			}, (0, react.createElement)("path", {
				d: "M4 6l4 4 4-4",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.5,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}))), historyOpen && (0, react.createElement)("ul", { style: LIST_STYLE$1 }, history.map((path) => (0, react.createElement)(PathRow, {
				key: path,
				path,
				t,
				open
			}))));
		}
		//#endregion
		//#region src/client/summary/memory-slots.ts
		/**
		* The `memorySlots` projection — reading it.
		*
		* The projection unit is registered by `dsh-prime-memory` (key `memorySlots`,
		* wire view `{rev, count, openCount, slots[]}`); this plugin does NOT depend
		* on it — when the unit is not registered the client reads `undefined` from
		* `faceOf` and the section hides. This module is the read side of that
		* contract and is deliberately PURE — no React, no context, no IO — so the
		* narrowing can be tested directly.
		*
		* Forward compatibility: the shipped view carries `{id, title, kind, status,
		* priority}` only. A future prime-memory release may add `body`/`refs` to the
		* wire view (its projection plan keeps that door open); those fields are
		* narrowed opportunistically — present and well-formed → kept, absent or
		* malformed → dropped — so the section renders them without a brief-sidebar
		* change, and a malformed extra field can never blank the section.
		*/
		/** The projection key `dsh-prime-memory` registers (its canonical constant). */
		const MEMORY_SLOTS_KEY = "memorySlots";
		/**
		* Narrow a raw projection value into a memory-slots view.
		*
		* Two outcomes are kept apart, mirroring the deliverables read side:
		* - `undefined` — the capability is ABSENT (prime-memory is not in the
		*   composition, or no frame has carried the key yet), or the frame is
		*   malformed beyond repair (a shape drift must not blank the whole tab);
		* - a view — the projection is live. A view with `slots: []` IS the empty
		*   state: prime-memory publishes as soon as the unit registers, so "present
		*   but empty" is a real value, not a sentinel.
		*
		* Malformed slot entries are dropped rather than thrown on (trusted-Host
		* value, defensive display), like `readTodos`.
		*
		* @param value - the raw `unknown` snapshot of the `memorySlots` face.
		* @returns the validated view, or `undefined` when the capability is absent.
		*/
		function readSlots(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
			const raw = value;
			if (!isCounter(raw["rev"]) || !isCounter(raw["count"]) || !isCounter(raw["openCount"])) return void 0;
			if (!Array.isArray(raw["slots"])) return void 0;
			const slots = [];
			for (const entry of raw["slots"]) {
				const slot = readSlot(entry);
				if (slot !== void 0) slots.push(slot);
			}
			return {
				rev: raw["rev"],
				count: raw["count"],
				openCount: raw["openCount"],
				slots
			};
		}
		/** Whether a value is a non-negative safe integer (the view's counter shape). */
		function isCounter(value) {
			return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
		}
		/** Narrow one slot entry; `undefined` = malformed, dropped. */
		function readSlot(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
			const raw = value;
			if (typeof raw["id"] !== "string" || raw["id"].length === 0) return void 0;
			if (typeof raw["title"] !== "string") return void 0;
			if (typeof raw["kind"] !== "string" || typeof raw["status"] !== "string") return void 0;
			if (typeof raw["priority"] !== "number") return void 0;
			const slot = {
				id: raw["id"],
				title: raw["title"],
				kind: raw["kind"],
				status: raw["status"],
				priority: raw["priority"]
			};
			if (typeof raw["body"] === "string" && raw["body"].length > 0) slot.body = raw["body"];
			if (Array.isArray(raw["refs"])) {
				const refs = raw["refs"].filter((ref) => typeof ref === "string" && ref.length > 0);
				if (refs.length > 0) slot.refs = refs;
			}
			if (Array.isArray(raw["refViews"])) {
				const views = [];
				for (const entry of raw["refViews"]) {
					if (entry === null || typeof entry !== "object" || Array.isArray(entry)) continue;
					const view = entry;
					if (typeof view["ref"] !== "string" || view["ref"].length === 0) continue;
					if (typeof view["title"] !== "string" || view["title"].length === 0) continue;
					views.push({
						ref: view["ref"],
						title: view["title"]
					});
				}
				if (views.length > 0) slot.refViews = views;
			}
			return slot;
		}
		/**
		* One-line truncation for a slot body. Already-short bodies pass through;
		* longer ones are cut at the limit with an ellipsis.
		*/
		function truncateBody(body, limit = 120) {
			const flat = body.replaceAll(/\s+/g, " ").trim();
			return flat.length <= limit ? flat : `${flat.slice(0, limit)}…`;
		}
		/**
		* Resolve the switch from one snapshot (pure; testable). Any
		* cannot-answer shape falls back to {@link DEFAULT_SHOW_MEMORY_SLOTS}; an
		* explicit `false` is the only off.
		*/
		function resolveShowMemorySlots(snapshot) {
			if (snapshot === void 0 || snapshot.status !== "ready") return true;
			return snapshot.value?.showMemorySlots !== false;
		}
		//#endregion
		//#region src/client/summary/MemorySlotsSection.tsx
		/**
		* The memory-slots section: the `memorySlots` projection drawn as the third
		* part of the summary tab (fixed last: 进展 → 产物 → 记忆).
		*
		* TWO gates, both fail-open to "hidden", so a host without dsh-prime-memory
		* paints nothing here:
		*
		* 1. **The switch.** This plugin's entry config (`configForms` → entry
		*    `dsh-brief-sidebar`, field `showMemorySlots`, default on). When the
		*    config face cannot answer (service absent, scope not ready, field
		*    unset) the default applies — see `scope-face.ts`.
		* 2. **The capability.** The `memorySlots` projection must exist for the
		*    session; `undefined` hides the section entirely, exactly like the
		*    optional deliverables section.
		*
		* Colours come from `--dsw-alias-*` tokens only (skin contract, enforced by
		* `tests/purity.spec.ts`).
		*/
		const SECTION_STYLE = {
			flexShrink: 0,
			borderBottom: "1px solid var(--dsw-alias-border-secondary)"
		};
		const HEADER_STYLE$1 = {
			padding: "10px 12px 0",
			color: "var(--dsw-alias-label-secondary)",
			fontSize: 12,
			fontWeight: 600
		};
		const LIST_STYLE = {
			listStyle: "none",
			margin: 0,
			padding: "6px 0",
			display: "flex",
			flexDirection: "column"
		};
		const ROW_STYLE$1 = {
			display: "flex",
			alignItems: "flex-start",
			gap: 8,
			padding: "6px 12px"
		};
		const TITLE_STYLE = {
			minWidth: 0,
			overflowWrap: "anywhere",
			color: "var(--dsw-alias-label-secondary)"
		};
		const META_STYLE = {
			flexShrink: 0,
			color: "var(--dsw-alias-label-tertiary)",
			fontSize: 11,
			lineHeight: "18px",
			whiteSpace: "nowrap"
		};
		/** The kind pill: same form as the codeplan pill, tertiary emphasis. */
		const KIND_STYLE = {
			flexShrink: 0,
			color: "var(--dsw-alias-label-tertiary)",
			border: "1px solid var(--dsw-alias-label-tertiary)",
			borderRadius: 999,
			padding: "0 6px",
			fontSize: 11,
			lineHeight: "16px",
			whiteSpace: "nowrap"
		};
		/** The status pill: filled tint for an open slot, plain text otherwise. */
		const STATUS_OPEN_STYLE = {
			flexShrink: 0,
			color: "var(--dsw-alias-label-primary)",
			border: "1px solid var(--dsw-alias-label-secondary)",
			borderRadius: 999,
			padding: "0 6px",
			fontSize: 11,
			lineHeight: "16px",
			whiteSpace: "nowrap"
		};
		const STATUS_SETTLED_STYLE = {
			...STATUS_OPEN_STYLE,
			color: "var(--dsw-alias-label-tertiary)",
			border: "1px solid var(--dsw-alias-label-tertiary)"
		};
		const BODY_STYLE$1 = {
			margin: 0,
			minWidth: 0,
			overflowWrap: "anywhere",
			color: "var(--dsw-alias-label-tertiary)",
			fontSize: 12,
			lineHeight: "18px"
		};
		const REFS_STYLE = {
			...BODY_STYLE$1,
			fontSize: 11
		};
		const TOTAL_STYLE = {
			padding: "6px 12px 10px",
			color: "var(--dsw-alias-label-tertiary)",
			fontSize: 12
		};
		const EMPTY_STYLE = {
			margin: "0 auto",
			padding: 24,
			maxWidth: 460,
			textAlign: "center",
			color: "var(--dsw-alias-label-tertiary)",
			lineHeight: 1.7,
			fontSize: 12
		};
		/** Locale key per known slot status; unknown statuses fall back to the raw wire value. */
		const STATUS_KEY = {
			open: "slots.status.open",
			done: "slots.status.done",
			dropped: "slots.status.dropped",
			expired: "slots.status.expired"
		};
		/**
		* One slot row: kind pill, title (full body rides the tooltip), status pill,
		* priority; body line underneath when the wire view carries it; refs as
		* resolved 名称简述 (record_id → title) with the raw refs on the tooltip, or
		* raw refs when the host has not resolved them.
		*/
		function SlotRow(props) {
			const { slot, t } = props;
			const statusLabel = STATUS_KEY[slot.status] === void 0 ? slot.status : t(STATUS_KEY[slot.status]);
			const title = slot.body === void 0 ? slot.title : `${slot.title} — ${slot.body}`;
			const refsLine = slot.refViews !== void 0 ? slot.refViews.map((view) => view.title).join(" · ") : slot.refs !== void 0 ? slot.refs.join(" · ") : void 0;
			return (0, react.createElement)("li", { style: ROW_STYLE$1 }, (0, react.createElement)("span", { style: KIND_STYLE }, slot.kind), (0, react.createElement)("div", { style: {
				minWidth: 0,
				flex: "1 1 auto",
				display: "flex",
				flexDirection: "column",
				gap: 2
			} }, (0, react.createElement)("span", {
				style: TITLE_STYLE,
				title
			}, slot.title), slot.body !== void 0 && (0, react.createElement)("p", { style: BODY_STYLE$1 }, truncateBody(slot.body)), refsLine !== void 0 && (0, react.createElement)("p", {
				style: REFS_STYLE,
				title: slot.refs !== void 0 ? slot.refs.join("\n") : void 0
			}, refsLine)), (0, react.createElement)("span", { style: META_STYLE }, `P${slot.priority}`), (0, react.createElement)("span", { style: slot.status === "open" ? STATUS_OPEN_STYLE : STATUS_SETTLED_STYLE }, statusLabel));
		}
		/**
		* A no-op unsubscribe source, kept as one identity so the absent-scope
		* subscription never thrashes (returns a no-op disposer, as the store
		* contract requires).
		*/
		const NO_SUBSCRIBE$1 = () => () => {};
		/**
		* The snapshot served while no config scope is reachable — resolves to the
		* switch default (on) in `resolveShowMemorySlots`.
		*/
		const ABSENT_SNAPSHOT = {
			status: "unavailable",
			value: void 0,
			revision: void 0,
			writable: false
		};
		/**
		* Subscribe to this plugin's entry config and resolve the section switch.
		*
		* The scope is resolved defensively (a host without `configForms` degrades to
		* the default instead of throwing inside a render) and subscribed with
		* `useSyncExternalStore`, so flipping the switch in settings updates the open
		* tab without a reload.
		*
		* @param ctx - the client root context handed to the tab body.
		* @returns whether the memory-slots section may render at all.
		*/
		function useShowMemorySlots(ctx) {
			const scope = (0, react.useMemo)(() => {
				if (ctx === void 0) return void 0;
				const configForms = ctx.get("configForms");
				if (configForms === void 0 || typeof configForms.get !== "function") return void 0;
				return configForms.get("dsh-brief-sidebar");
			}, [ctx]);
			const subscribe = (0, react.useCallback)((listener) => scope?.subscribe(listener) ?? NO_SUBSCRIBE$1(), [scope]);
			const getSnapshot = (0, react.useCallback)(() => scope?.getSnapshot() ?? ABSENT_SNAPSHOT, [scope]);
			return resolveShowMemorySlots((0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot));
		}
		/**
		* The memory-slots section. Both hooks run unconditionally (a conditional
		* hook order would break the moment the switch flips); the switch only
		* decides whether the resolved view paints.
		* @param props - translation, client context, session scope.
		*/
		function MemorySlotsSection(props) {
			const { t, ctx, scope } = props;
			const show = useShowMemorySlots(ctx);
			const view = readSlots(useProjectionValue(ctx, scope?.sessionId, MEMORY_SLOTS_KEY));
			if (show === false) return null;
			if (view === void 0) return null;
			if (view.slots.length === 0) return (0, react.createElement)("div", {
				style: SECTION_STYLE,
				"data-dsh-brief-sidebar": "memory-slots-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE$1 }, t("section.memorySlots")), (0, react.createElement)("div", { style: EMPTY_STYLE }, (0, react.createElement)("div", { style: {
				marginBottom: 6,
				color: "var(--dsw-alias-label-secondary)"
			} }, t("slots.empty")), (0, react.createElement)("div", null, t("slots.emptyHint"))));
			return (0, react.createElement)("div", {
				style: SECTION_STYLE,
				"data-dsh-brief-sidebar": "memory-slots-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE$1 }, t("section.memorySlots")), (0, react.createElement)("ul", { style: LIST_STYLE }, view.slots.map((slot) => (0, react.createElement)(SlotRow, {
				key: slot.id,
				slot,
				t
			}))), (0, react.createElement)("div", { style: TOTAL_STYLE }, expandCount(t("slots.openCount"), view.openCount)));
		}
		//#endregion
		//#region src/client/SummaryTab.tsx
		/**
		* The summary tab body: the session's at-a-glance state, composed of sections.
		*
		* Section order: 进展 (the todos board) → 产物 (produced files, codeplan
		* artifacts marked inline) → 记忆 (the active memory slots of the session,
		* served by the `memorySlots` projection dsh-prime-memory registers).
		* Each section owns its own data chain and its own gating contract; this
		* component owns only the shell.
		*
		* Two better-sidebar contracts are honoured:
		*
		* 1. **Height contract.** The tab body mounts inside a full-height column flex
		*    host whose `.paneBody` is a definite-height BLOCK scroll container. The
		*    root declares `height: 100%` + `min-height: 0`, and the scrolling element
		*    is an inner div — not the root. Sections are non-scrolling slices with a
		*    bottom border; the inner div scrolls them all.
		* 2. **`visible` pause.** Nothing is drawn while the tab is not the active
		*    one, so a hidden tab does not re-render on every projection frame.
		*/
		const ROOT_STYLE = {
			display: "flex",
			flexDirection: "column",
			height: "100%",
			minHeight: 0,
			background: "var(--dsw-alias-bg-layer-1)",
			color: "var(--dsw-alias-label-primary)",
			font: "inherit",
			fontSize: 13
		};
		const SCROLL_STYLE = {
			flex: 1,
			minHeight: 0,
			overflow: "auto"
		};
		/**
		* The summary tab.
		* @param props - translation, client context, session scope, visibility.
		*/
		function SummaryTab(props) {
			const { t, ctx, scope, visible = true } = props;
			if (!visible) return null;
			return (0, react.createElement)("div", {
				style: ROOT_STYLE,
				"data-dsh-brief-sidebar": "board"
			}, (0, react.createElement)("div", { style: SCROLL_STYLE }, (0, react.createElement)(TodoSection, {
				key: "progress",
				t,
				ctx,
				scope
			}), (0, react.createElement)(DeliverablesSection, {
				key: "deliverables",
				t,
				ctx,
				scope
			}), (0, react.createElement)(MemorySlotsSection, {
				key: "memory-slots",
				t,
				ctx,
				scope
			})));
		}
		//#endregion
		//#region src/client/BriefIcon.tsx
		/**
		* A checklist mark: three rows with ticks and text rails — the same status
		* vocabulary the board paints.
		* @param size - square edge in px (the host passes its own tab-icon size).
		*/
		function BriefIcon(size) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				focusable: "false",
				style: {
					display: "block",
					flex: "none"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: 1.6,
						y: 2.4,
						width: 12.8,
						height: 11.2,
						rx: 2,
						stroke: "var(--dsw-alias-label-tertiary)",
						strokeWidth: 1.2
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M4.2 6.1l1 1 1.8-2",
						stroke: "var(--dsw-alias-state-success-primary)",
						strokeWidth: 1.3,
						strokeLinecap: "round",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M4.2 10.6l1 1 1.8-2",
						stroke: "var(--dsw-alias-label-tertiary)",
						strokeWidth: 1.3,
						strokeLinecap: "round",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M8.4 6.4h4M8.4 10.9h4",
						stroke: "var(--dsw-alias-label-tertiary)",
						strokeWidth: 1.2,
						strokeLinecap: "round"
					})
				]
			});
		}
		//#endregion
		//#region src/client/brief/dock-shadow.tsx
		/** The built-in cell id of the official todo dock. */
		const TODO_CELL_ID = "todo";
		/** The replacement entry: deliberately empty. */
		function TodoDockShadow() {
			return null;
		}
		/**
		* Register the shadowing entry.
		*
		* The caller wraps this in `ctx.effect(...)` so the returned disposer rides the
		* plugin fiber: unloading the plugin restores the official dock.
		*
		* @param ctx - the client root context.
		* @returns the disposer, or undefined when the slots service is unreachable.
		*/
		function registerTodoDockShadow(ctx) {
			const slots = ctx.get("slots");
			if (slots === void 0 || typeof slots.inject !== "function") return void 0;
			return slots.inject("conversation.input.dock", () => slots.register({
				name: "conversation.input.dock",
				id: TODO_CELL_ID,
				order: 0,
				priority: -1,
				registrant: "dsh-brief-sidebar"
			}, TodoDockShadow));
		}
		//#endregion
		//#region src/client/settings-card.tsx
		/**
		* BriefSettingsCard — the brief-sidebar settings card.
		*
		* One component mounted at TWO seats, fed by the SAME inject factory (one
		* source of truth, the dsh-thinking-levels arrangement):
		*
		* - the plugin-family settings section (「起子插件设置」, the `settings.section`
		*   entry dsh-thinking-levels registers; this plugin contributes its card to
		*   the `dsh-family.tab` child slot — the inject idles harmlessly when the
		*   family section is absent);
		* - the Plugins-page configuration card (`plugins.bundle.config`, keyed by
		*   the package name, rendered on the bundle's detail page).
		*
		* The card binds this plugin's entry config through the `configForms` service
		* and renders the fields the summary tab reads. Every change commits
		* immediately through the scope (no staged form), so a flip applies to the
		* open summary tab on its next render.
		*
		* The `t` binder is injected by the factory (the same closure the tab uses) —
		* the card does not rely on the framework's locale props, so it renders the
		* active language on every host generation. Kept dependency-free beyond
		* react: inline styles over `--dsw-alias-*` tokens only (no CSS modules, no
		* hex/rgba literals — the purity spec enforces the token contract).
		*/
		/** A no-op unsubscribe source, kept as one identity so effects never thrash. */
		const NO_SUBSCRIBE = () => () => {};
		/** The snapshot served while no scope is reachable. */
		const ABSENT = {
			status: "unavailable",
			value: void 0,
			revision: void 0,
			writable: false
		};
		const CARD_STYLE = {
			border: "1px solid var(--dsw-alias-border-l2)",
			background: "var(--dsw-alias-bg-layer-3)",
			borderRadius: 12,
			transition: "border-color 0.16s, background 0.16s"
		};
		const HEADER_STYLE = {
			appearance: "none",
			width: "100%",
			font: "inherit",
			color: "inherit",
			textAlign: "left",
			cursor: "pointer",
			background: "none",
			border: 0,
			borderRadius: 12,
			display: "flex",
			alignItems: "center",
			gap: 12,
			padding: "14px 16px"
		};
		const HEADER_TEXT_STYLE = {
			flex: "1 1 0%",
			minWidth: 0
		};
		const NAME_STYLE = {
			fontSize: 14,
			fontWeight: 600,
			color: "var(--dsw-alias-label-primary)"
		};
		const DESC_STYLE = {
			color: "var(--dsw-alias-label-tertiary)",
			fontSize: 13,
			lineHeight: 1.5
		};
		const CHEVRON_STYLE = (open) => ({
			color: "var(--dsw-alias-label-tertiary)",
			flex: "0 0 auto",
			transition: "transform 0.16s",
			transform: open ? "rotate(180deg)" : "none"
		});
		const BODY_STYLE = { padding: "12px 16px" };
		const ROW_STYLE = {
			display: "flex",
			alignItems: "flex-start",
			justifyContent: "space-between",
			gap: 12,
			padding: "8px 0",
			fontSize: 13,
			lineHeight: "20px"
		};
		const ROW_TEXT_STYLE = {
			display: "flex",
			flexDirection: "column",
			gap: 4,
			minWidth: 0
		};
		const LABEL_STYLE = {
			margin: 0,
			color: "var(--dsw-alias-label-primary)"
		};
		const HINT_STYLE = {
			margin: 0,
			fontSize: 12,
			lineHeight: "18px",
			color: "var(--dsw-alias-label-tertiary)"
		};
		const SWITCH_STYLE = {
			flexShrink: 0,
			margin: 0,
			cursor: "pointer"
		};
		/**
		* The settings card body. `scope` is optional on purpose: the inject factory
		* always provides it, but a host whose `configForms` face degrades must not
		* crash the settings page — the card renders the unavailable note and keeps
		* its header.
		*/
		function BriefSettingsCard(props) {
			const { t, scope } = props;
			const [open, setOpen] = (0, react.useState)(true);
			const snapshot = (0, react.useSyncExternalStore)((0, react.useCallback)((listener) => scope?.subscribe(listener) ?? NO_SUBSCRIBE(), [scope]), (0, react.useCallback)(() => scope?.getSnapshot() ?? ABSENT, [scope]), (0, react.useCallback)(() => scope?.getSnapshot() ?? ABSENT, [scope]));
			const unavailable = scope === void 0 || snapshot.status === "unavailable";
			const readonly = unavailable || !snapshot.writable;
			const checked = snapshot.value?.showMemorySlots !== false;
			return (0, react.createElement)("div", {
				style: CARD_STYLE,
				"data-dsh-brief-sidebar": "settings-card"
			}, (0, react.createElement)("button", {
				type: "button",
				"aria-expanded": open,
				style: HEADER_STYLE,
				onClick: () => {
					setOpen((current) => !current);
				}
			}, (0, react.createElement)("span", { style: HEADER_TEXT_STYLE }, (0, react.createElement)("div", { style: NAME_STYLE }, t("settings.title")), (0, react.createElement)("div", { style: DESC_STYLE }, t("settings.desc"))), (0, react.createElement)("svg", {
				width: 16,
				height: 16,
				viewBox: "0 0 16 16",
				"aria-hidden": true,
				style: CHEVRON_STYLE(open)
			}, (0, react.createElement)("path", {
				d: "M4 6l4 4 4-4",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.5,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}))), open && (0, react.createElement)("div", { style: BODY_STYLE }, unavailable ? (0, react.createElement)("p", { style: HINT_STYLE }, t("settings.unavailable")) : (0, react.createElement)("div", { style: ROW_STYLE }, (0, react.createElement)("div", { style: ROW_TEXT_STYLE }, (0, react.createElement)("label", {
				htmlFor: "dsh-brief-sidebar-show-memory-slots",
				style: LABEL_STYLE
			}, t("settings.memorySlots")), (0, react.createElement)("p", { style: HINT_STYLE }, t("settings.memorySlotsHint"))), (0, react.createElement)("input", {
				id: "dsh-brief-sidebar-show-memory-slots",
				type: "checkbox",
				checked,
				disabled: readonly,
				style: SWITCH_STYLE,
				onChange: (event) => {
					scope?.set("showMemorySlots", event.currentTarget.checked);
				}
			})), !unavailable && !snapshot.writable && (0, react.createElement)("p", { style: HINT_STYLE }, t("settings.readonly"))));
		}
		//#endregion
		//#region src/client/index.tsx
		/**
		* Browser half: the task board tab, plus the shadow that hides the official
		* composer-band todo panel.
		*
		* Registration order matters and is deliberate:
		*
		* 1. **Dictionaries first.** Every later registration can render translated
		*    copy, and a dictionary that lands after the first paint would show raw
		*    keys for a frame.
		* 2. **Soft-dependency check.** `inject` already waits for `betterSidebar`, so
		*    the guard only fires in a composition that relaxes the inject list. It is
		*    kept because it is what stops the plugin from hiding the official panel
		*    when it has no board to replace it with.
		* 3. **Shadow the official dock.** Deliberately BEFORE the tab registration:
		*    the panel is the only other carrier of the list, so the replacement has to
		*    exist in the same activation.
		* 4. **Register the tab.**
		* 5. **Register the settings cards.** The memory-section switch gets TWO
		*    faces from ONE component + ONE inject factory: a card in the plugin-family
		*    settings section (「起子插件设置」, hosted by dsh-thinking-levels) and the
		*    Plugins-page configuration card. `configForms` resolves through a
		*    deferred inject (the service may start after apply — the same lateness
		*    the composer model panel in dsh-thinking-levels guards against); on a
		*    host without it the cards never register and the section gate falls back
		*    to its default (on).
		*
		* Every registration rides `ctx.effect(fn, label)` so its disposer is revoked on
		* fiber teardown (HMR / disable), which is also what makes the shadow
		* reversible: unload the plugin and the official dock renders again. The
		* settings cards are the family-proven exception: they ride the deferred
		* `configForms` inject whose disposers are not held (same as
		* dsh-thinking-levels' composer panel registration).
		*
		* Contract notes for the two surfaces touched here:
		* - better-sidebar tabs are hosted by DSH's native right Sidebar, so the tab
		*   body receives `TabComponentProps` (`ctx` + `scope` + `visible`) and NOT the
		*   framework's session-scoped slot props.
		* - `conversation.input.dock` is the DSH slot the official todo panel occupies;
		*   see `brief/dock-shadow.tsx` for why a lower priority wins the cell.
		*/
		/**
		* Tab type id. Package-prefixed so it cannot collide with a built-in type.
		* Unchanged since the 0.1.0 board tab: the summary tab REPLACES the board tab
		* in place, so an opened or pinned tab survives the upgrade.
		*/
		const TAB_ID = "dsh-brief-sidebar:board";
		/**
		* Position in the host's new-tab guide.
		*
		* Built-ins on this host generation sit at editor 10 / git 20 / subagent 30 /
		* sidechat 35 / terminal 40 / browser 50. 15 places a per-session task board
		* right after the editor, which is where a reader looks for session state.
		*/
		const TAB_ORDER = 15;
		/** Services required before `apply` runs. */
		const inject = [
			"betterSidebar",
			"locale",
			"slots"
		];
		/**
		* An effect body must return a disposer (cordis rejects `undefined` with a
		* `TypeError`), so a path that could not register anything returns this no-op
		* instead of nothing.
		*/
		const NOOP = () => {};
		/**
		* Browser-face apply.
		*
		* @param ctx - the client root context.
		*/
		function apply(ctx) {
			const locale = ctx.get("locale");
			if (locale !== void 0) ctx.effect(() => locale.register(NS, dictionaries), "dsh-brief-sidebar: dictionaries");
			/**
			* Translate one of our keys. `bind` returns a cached function that reads the
			* ACTIVE locale at call time, so a language switch needs no re-apply; an
			* unknown namespace or key falls back to the key itself rather than throwing
			* inside a render.
			*/
			const t = (key) => {
				if (locale === void 0) return key;
				try {
					return locale.bind("dsh-brief-sidebar")(key) || key;
				} catch {
					return key;
				}
			};
			const bar = ctx.get("betterSidebar");
			if (bar === void 0) return;
			ctx.effect(() => registerTodoDockShadow(ctx) ?? NOOP, "dsh-brief-sidebar: dock shadow");
			ctx.effect(() => bar.registerTab({
				id: TAB_ID,
				title: () => t("tab.title"),
				description: () => t("tab.desc"),
				icon: (size) => BriefIcon(size),
				order: 15,
				single: true,
				/**
				* Unfinished count on the tab strip. Called on every tab-bar render, so
				* it reads one snapshot and allocates no subscription; a completed list
				* shows no badge at all.
				*/
				badge: (badgeCtx, badgeScope) => {
					const todos = readTodos(projectionSnapshot(badgeCtx, badgeScope.sessionId, TODOS_KEY));
					if (todos === void 0) return null;
					const pending = unfinishedCount(todos);
					return pending > 0 ? pending : null;
				},
				component: (props) => (0, react.createElement)(SummaryTab, {
					t,
					ctx: props.ctx,
					scope: props.scope,
					visible: props.visible
				})
			}), "dsh-brief-sidebar: tab");
			const slots = ctx.get("slots");
			ctx.inject(["configForms"], (scope) => {
				const configForms = scope.configForms;
				if (slots === void 0 || configForms === void 0 || typeof configForms.get !== "function") return;
				/** Same face for both seats: the entry scope plus the applied-time binder. */
				const injectFactory = () => ({
					t,
					scope: configForms.get("dsh-brief-sidebar")
				});
				/** The slot core hands the component `unknown` props (registry typing). */
				const component = BriefSettingsCard;
				slots.inject("dsh-family.tab", () => slots.register({
					name: "dsh-family.tab",
					id: "brief-sidebar",
					order: 30,
					label: () => t("settings.title"),
					inject: injectFactory
				}, component));
				slots.inject("plugins.bundle.config", () => slots.register({
					name: "plugins.bundle.config",
					key: "dsh-brief-sidebar",
					inject: injectFactory
				}, component));
			});
		}
		//#endregion
		exports.TAB_ID = TAB_ID;
		exports.TAB_ORDER = TAB_ORDER;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map