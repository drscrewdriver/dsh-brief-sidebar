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
export const NS = 'dsh-todo-sidebar'

/** Simplified Chinese dictionary — the key-set source of truth. */
export const zh = {
  'tab.title': '任务',
  'tab.desc': '当前会话的 todo 列表（只读）',
  'board.empty': '当前没有任务',
  'board.emptyHint': '模型调用 todo_write 之后，任务会出现在这里。',
  'board.unavailable': '任务暂不可用',
  'board.unavailableHint': '这个会话还没有收到 todo 数据；宿主推来第一帧后会自动显示。',
  'status.pending': '待处理',
  'status.inProgress': '进行中',
  'status.completed': '已完成',
}

/** The key union: what a `t('…')` call may name inside this namespace. */
export type TodoKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en: Record<TodoKey, string> = {
  'tab.title': 'Tasks',
  'tab.desc': 'Todo list of this session (read-only)',
  'board.empty': 'No tasks yet',
  'board.emptyHint': 'Tasks show up here once the model calls todo_write.',
  'board.unavailable': 'Tasks unavailable',
  'board.unavailableHint':
    'This session has not received any todo data yet; the board fills in on the first frame.',
  'status.pending': 'Pending',
  'status.inProgress': 'In progress',
  'status.completed': 'Done',
}

/**
 * Both locales in the shape the locale service consumes. Registered in ONE
 * call: the registry rejects a duplicate `(namespace, locale)` pair and the
 * per-locale form would leave a half-registered namespace if the second call
 * threw.
 */
export const dictionaries: Record<string, Record<string, string>> = { zh, en }
