window.__ModuleLoader__.load({
	id: "dsh-todo-sidebar",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/todo/board.ts
		const STATUSES = [
			"pending",
			"in_progress",
			"completed"
		];
		/** Locale key per status. Kept here so this module owns the vocabulary. */
		const STATUS_KEY = {
			pending: "status.pending",
			in_progress: "status.inProgress",
			completed: "status.completed"
		};
		/** Locale key for one status label. */
		function statusKey(status) {
			return STATUS_KEY[status];
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
		const NO_SUBSCRIBE = () => {};
		/** A source that never has a value — the absent-capability face. */
		const ABSENT = {
			getSnapshot: () => void 0,
			subscribe: () => NO_SUBSCRIBE
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
			if (ctx === void 0 || sessionId === void 0) return ABSENT;
			const sessions = ctx.get("sessions");
			if (sessions === void 0 || typeof sessions.binding !== "function") return ABSENT;
			const projections = sessions.binding(sessionId)?.session?.projections;
			if (projections === void 0 || typeof projections.faceOf !== "function") return ABSENT;
			const face = projections.faceOf(key);
			return isFace(face) ? face : ABSENT;
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
		//#region src/client/todo/use-todos.ts
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
		* `todo/dock-shadow.tsx`), so the projection is read here and rendered as an
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
		const SECTION_STYLE$1 = {
			flexShrink: 0,
			borderBottom: "1px solid var(--dsw-alias-border-secondary)"
		};
		const HEADER_STYLE$1 = {
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
		const LIST_STYLE$1 = {
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
			return (0, react.createElement)("li", { style: ROW_STYLE$1 }, (0, react.createElement)("span", { style: pillStyle(item.status) }, t(statusKey(item.status))), (0, react.createElement)("span", { style: contentStyle(item.status) }, item.content));
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
				style: SECTION_STYLE$1,
				"data-dsh-todo-sidebar": "progress-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE$1 }, t("section.progress")), (0, react.createElement)(Notice, {
				title: t("board.unavailable"),
				detail: t("board.unavailableHint")
			}));
			if (todos.length === 0) return (0, react.createElement)("div", {
				style: SECTION_STYLE$1,
				"data-dsh-todo-sidebar": "progress-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE$1 }, t("section.progress")), (0, react.createElement)(Notice, {
				title: t("board.empty"),
				detail: t("board.emptyHint")
			}));
			const counts = countTodos(todos);
			return (0, react.createElement)("div", {
				style: SECTION_STYLE$1,
				"data-dsh-todo-sidebar": "progress-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE$1 }, t("section.progress")), (0, react.createElement)("div", { style: PROGRESS_STYLE }, progressLine(counts, t)), (0, react.createElement)("ul", { style: LIST_STYLE$1 }, todos.map((item, index) => (0, react.createElement)(TodoRow, {
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
		//#endregion
		//#region src/client/locales.ts
		/**
		* Plugin-owned i18n dictionaries.
		*
		* Consumer plugins must NOT reach into better-sidebar's internal `t()` or its
		* `betterSidebar` dictionary namespace, so this plugin registers its own
		* namespace through the DSH `locale` service. `dsh-todo-sidebar` is outside the
		* `LocaleNamespaceMap` merge table, which is exactly what the untyped
		* `register(ns, dicts)` overload is for — but the dictionaries themselves stay
		* strictly paired: `zh` is the key-set source of truth and `en` is typed as
		* `Record<keyof typeof zh, string>`, so a missing or extra English key is a
		* COMPILE error rather than a runtime fallback to the raw key.
		*
		* Every key referenced anywhere in `src/**` must exist in both dictionaries;
		* `tests/purity.spec.ts` asserts that, so a typo in a `t('…')` call cannot
		* ship as an untranslated literal.
		*/
		/** The namespace owned by this plugin (own vocabulary, own lifecycle). */
		const NS = "dsh-todo-sidebar";
		/**
		* Both locales in the shape the locale service consumes. Registered in ONE
		* call: the registry rejects a duplicate `(namespace, locale)` pair and the
		* per-locale form would leave a half-registered namespace if the second call
		* threw.
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
				"deliverables.sessionTotal": "本会话共 {count} 个文件",
				"deliverable.codeplanTag": "规划"
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
				"deliverables.sessionTotal": "{count} files in this session",
				"deliverable.codeplanTag": "Plan"
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
		const SECTION_STYLE = {
			flexShrink: 0,
			borderBottom: "1px solid var(--dsw-alias-border-secondary)"
		};
		const HEADER_STYLE = {
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
		const ROW_STYLE = {
			display: "flex",
			alignItems: "flex-start",
			gap: 8,
			padding: "6px 12px"
		};
		const TOTAL_STYLE = {
			padding: "6px 12px 10px",
			color: "var(--dsw-alias-label-tertiary)",
			fontSize: 12
		};
		const PATH_STYLE = {
			minWidth: 0,
			overflowWrap: "anywhere",
			color: "var(--dsw-alias-label-secondary)"
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
		/** One produced-file row; a codeplan artifact carries the pill. */
		function PathRow(props) {
			const { path, t } = props;
			const plan = splitCodeplanPath(path);
			const title = plan === null ? path : `${t("deliverable.codeplanTag")}: ${plan.task} · ${path}`;
			return (0, react.createElement)("li", { style: ROW_STYLE }, plan === null ? null : (0, react.createElement)("span", { style: TAG_STYLE }, t("deliverable.codeplanTag")), (0, react.createElement)("span", {
				style: PATH_STYLE,
				title
			}, basename(path)));
		}
		/**
		* The deliverables section. The subscription is unconditional (a plain
		* listener, not IO).
		* @param props - translation, client context, session scope.
		*/
		function DeliverablesSection(props) {
			const { t, ctx, scope } = props;
			const view = readDeliverables(useProjectionValue(ctx, scope?.sessionId, DELIVERABLES_KEY));
			if (view === void 0) return null;
			const latestPaths = view.latest?.paths ?? [];
			if (latestPaths.length === 0 && view.sessionTotal === 0) return (0, react.createElement)("div", {
				style: SECTION_STYLE,
				"data-dsh-todo-sidebar": "deliverables-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE }, t("section.deliverables")), (0, react.createElement)("div", { style: {
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
				style: SECTION_STYLE,
				"data-dsh-todo-sidebar": "deliverables-section"
			}, (0, react.createElement)("div", { style: HEADER_STYLE }, t("section.deliverables")), (0, react.createElement)("ul", { style: LIST_STYLE }, latestPaths.map((path) => (0, react.createElement)(PathRow, {
				key: path,
				path,
				t
			}))), (0, react.createElement)("div", { style: TOTAL_STYLE }, expandCount(t("deliverables.sessionTotal"), view.sessionTotal)));
		}
		//#endregion
		//#region src/client/SummaryTab.tsx
		/**
		* The summary tab body: the session's at-a-glance state, composed of sections.
		*
		* Section order: 进展 (the todos board) → 产物 (produced files, codeplan
		* artifacts marked inline) → the reserved memory-recall slot (see below).
		* Each section owns its own data chain and its own three-state contract; this
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
				"data-dsh-todo-sidebar": "board"
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
			}), null));
		}
		//#endregion
		//#region src/client/TodoIcon.tsx
		/**
		* A checklist mark: three rows with ticks and text rails — the same status
		* vocabulary the board paints.
		* @param size - square edge in px (the host passes its own tab-icon size).
		*/
		function TodoIcon(size) {
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
		//#region src/client/todo/dock-shadow.tsx
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
				registrant: "dsh-todo-sidebar"
			}, TodoDockShadow));
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
		*
		* Every registration rides `ctx.effect(fn, label)` so its disposer is revoked on
		* fiber teardown (HMR / disable), which is also what makes the shadow
		* reversible: unload the plugin and the official dock renders again.
		*
		* Contract notes for the two surfaces touched here:
		* - better-sidebar tabs are hosted by DSH's native right Sidebar, so the tab
		*   body receives `TabComponentProps` (`ctx` + `scope` + `visible`) and NOT the
		*   framework's session-scoped slot props.
		* - `conversation.input.dock` is the DSH slot the official todo panel occupies;
		*   see `todo/dock-shadow.tsx` for why a lower priority wins the cell.
		*/
		/**
		* Tab type id. Package-prefixed so it cannot collide with a built-in type.
		* Unchanged since the 0.1.0 board tab: the summary tab REPLACES the board tab
		* in place, so an opened or pinned tab survives the upgrade.
		*/
		const TAB_ID = "dsh-todo-sidebar:board";
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
			if (locale !== void 0) ctx.effect(() => locale.register(NS, dictionaries), "dsh-todo-sidebar: dictionaries");
			/**
			* Translate one of our keys. `bind` returns a cached function that reads the
			* ACTIVE locale at call time, so a language switch needs no re-apply; an
			* unknown namespace or key falls back to the key itself rather than throwing
			* inside a render.
			*/
			const t = (key) => {
				if (locale === void 0) return key;
				try {
					return locale.bind("dsh-todo-sidebar")(key) || key;
				} catch {
					return key;
				}
			};
			const bar = ctx.get("betterSidebar");
			if (bar === void 0) return;
			ctx.effect(() => registerTodoDockShadow(ctx) ?? NOOP, "dsh-todo-sidebar: dock shadow");
			ctx.effect(() => bar.registerTab({
				id: TAB_ID,
				title: () => t("tab.title"),
				description: () => t("tab.desc"),
				icon: (size) => TodoIcon(size),
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
			}), "dsh-todo-sidebar: tab");
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