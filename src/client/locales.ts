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
export const NS = 'dsh-brief-sidebar'

/** Simplified Chinese dictionary — the key-set source of truth. */
export const zh = {
  'tab.title': '概要',
  'tab.desc': '当前会话的任务、产物与规划文件（只读）',
  'section.progress': '进展',
  'section.deliverables': '产物',
  'board.empty': '当前没有任务',
  'board.emptyHint': '模型调用 todo_write 之后，任务会出现在这里。',
  'board.unavailable': '任务暂不可用',
  'board.unavailableHint': '这个会话还没有收到 todo 数据；宿主推来第一帧后会自动显示。',
  'status.pending': '待处理',
  'status.inProgress': '进行中',
  'status.completed': '已完成',
  'deliverables.empty': '本回合暂无改动文件',
  'deliverables.emptyHint': '会话里成功写入或修改文件后，它们会实时出现在这里。',
  'deliverables.sessionTotal': '本会话共 {count} 个文件',
  'deliverable.codeplanTag': '规划',
}

/** The key union: what a `t('…')` call may name inside this namespace. */
export type BriefKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en: Record<BriefKey, string> = {
  'tab.title': 'Summary',
  'tab.desc': 'Tasks, produced files and plan artifacts of this session (read-only)',
  'section.progress': 'Progress',
  'section.deliverables': 'Produced files',
  'board.empty': 'No tasks yet',
  'board.emptyHint': 'Tasks show up here once the model calls todo_write.',
  'board.unavailable': 'Tasks unavailable',
  'board.unavailableHint':
    'This session has not received any todo data yet; the board fills in on the first frame.',
  'status.pending': 'Pending',
  'status.inProgress': 'In progress',
  'status.completed': 'Done',
  'deliverables.empty': 'No files changed in this turn',
  'deliverables.emptyHint': 'Files written or edited successfully in the session appear here live.',
  'deliverables.sessionTotal': '{count} files in this session',
  'deliverable.codeplanTag': 'Plan',
}

/** French dictionary, checked complete against the zh key set. */
export const fr: Record<BriefKey, string> = {
  'tab.title': 'Résumé',
  'tab.desc': 'Tâches, fichiers produits et plans de la session (lecture seule)',
  'section.progress': 'Avancement',
  'section.deliverables': 'Fichiers produits',
  'board.empty': 'Aucune tâche pour le moment',
  'board.emptyHint': 'Les tâches apparaissent ici dès que le modèle appelle todo_write.',
  'board.unavailable': 'Tâches indisponibles',
  'board.unavailableHint':
    'Cette session n’a pas encore reçu de données todo ; le tableau se remplit dès la première trame.',
  'status.pending': 'En attente',
  'status.inProgress': 'En cours',
  'status.completed': 'Terminé',
  'deliverables.empty': 'Aucun fichier modifié à ce tour',
  'deliverables.emptyHint': 'Les fichiers écrits ou modifiés dans la session apparaissent ici en direct.',
  'deliverables.sessionTotal': '{count} fichiers dans cette session',
  'deliverable.codeplanTag': 'Plan',
}

/** German dictionary, checked complete against the zh key set. */
export const de: Record<BriefKey, string> = {
  'tab.title': 'Übersicht',
  'tab.desc': 'Aufgaben, erzeugte Dateien und Pläne dieser Sitzung (schreibgeschützt)',
  'section.progress': 'Fortschritt',
  'section.deliverables': 'Erzeugte Dateien',
  'board.empty': 'Noch keine Aufgaben',
  'board.emptyHint': 'Aufgaben erscheinen hier, sobald das Modell todo_write aufruft.',
  'board.unavailable': 'Aufgaben nicht verfügbar',
  'board.unavailableHint':
    'Diese Sitzung hat noch keine Todo-Daten erhalten; das Board füllt sich mit dem ersten Frame.',
  'status.pending': 'Ausstehend',
  'status.inProgress': 'In Bearbeitung',
  'status.completed': 'Fertig',
  'deliverables.empty': 'Keine Dateien in diesem Durchgang geändert',
  'deliverables.emptyHint': 'In der Sitzung erfolgreich geschriebene oder geänderte Dateien erscheinen hier live.',
  'deliverables.sessionTotal': '{count} Dateien in dieser Sitzung',
  'deliverable.codeplanTag': 'Plan',
}

/** Italian dictionary, checked complete against the zh key set. */
export const it: Record<BriefKey, string> = {
  'tab.title': 'Riepilogo',
  'tab.desc': 'Attività, file prodotti e piani di questa sessione (sola lettura)',
  'section.progress': 'Avanzamento',
  'section.deliverables': 'File prodotti',
  'board.empty': 'Nessuna attività per ora',
  'board.emptyHint': 'Le attività appaiono qui quando il modello chiama todo_write.',
  'board.unavailable': 'Attività non disponibili',
  'board.unavailableHint':
    'Questa sessione non ha ancora ricevuto dati todo; la bacheca si riempirà al primo frame.',
  'status.pending': 'In attesa',
  'status.inProgress': 'In corso',
  'status.completed': 'Completato',
  'deliverables.empty': 'Nessun file modificato in questo turno',
  'deliverables.emptyHint': 'I file scritti o modificati nella sessione appaiono qui in tempo reale.',
  'deliverables.sessionTotal': '{count} file in questa sessione',
  'deliverable.codeplanTag': 'Piano',
}

/** Russian dictionary, checked complete against the zh key set. */
export const ru: Record<BriefKey, string> = {
  'tab.title': 'Сводка',
  'tab.desc': 'Задачи, созданные файлы и планы этой сессии (только чтение)',
  'section.progress': 'Ход работы',
  'section.deliverables': 'Созданные файлы',
  'board.empty': 'Задач пока нет',
  'board.emptyHint': 'Задачи появятся здесь, когда модель вызовет todo_write.',
  'board.unavailable': 'Задачи недоступны',
  'board.unavailableHint':
    'Эта сессия ещё не получила данные todo; доска заполнится после первого кадра.',
  'status.pending': 'Ожидает',
  'status.inProgress': 'В работе',
  'status.completed': 'Готово',
  'deliverables.empty': 'За этот ход файлы не менялись',
  'deliverables.emptyHint': 'Успешно записанные или изменённые файлы появляются здесь в реальном времени.',
  'deliverables.sessionTotal': 'Файлов в этой сессии: {count}',
  'deliverable.codeplanTag': 'План',
}

/** Spanish dictionary, checked complete against the zh key set. */
export const es: Record<BriefKey, string> = {
  'tab.title': 'Resumen',
  'tab.desc': 'Tareas, archivos generados y planes de esta sesión (solo lectura)',
  'section.progress': 'Avance',
  'section.deliverables': 'Archivos generados',
  'board.empty': 'Aún no hay tareas',
  'board.emptyHint': 'Las tareas aparecen aquí cuando el modelo llama a todo_write.',
  'board.unavailable': 'Tareas no disponibles',
  'board.unavailableHint':
    'Esta sesión aún no ha recibido datos de tareas; el tablero se llena con el primer fotograma.',
  'status.pending': 'Pendiente',
  'status.inProgress': 'En curso',
  'status.completed': 'Hecho',
  'deliverables.empty': 'Ningún archivo modificado en este turno',
  'deliverables.emptyHint': 'Los archivos escritos o editados en la sesión aparecen aquí en directo.',
  'deliverables.sessionTotal': '{count} archivos en esta sesión',
  'deliverable.codeplanTag': 'Plan',
}

/**
 * All locales in the shape the locale service consumes. Registered in ONE call:
 * the registry rejects a duplicate `(namespace, locale)` pair and the
 * per-locale form would leave a half-registered namespace if a later call
 * threw. `zh`/`en` are the host built-ins; the fr/de/it/ru/es pack rides the
 * same map form (every id is a valid BCP 47-style tag, so the registry accepts
 * it as-is).
 */
export const dictionaries: Record<string, Record<string, string>> = {
  zh,
  en,
  fr,
  de,
  it,
  ru,
  es,
}

/**
 * Expand the one `{count}` placeholder the deliverables totals line uses. The
 * locale binder is a plain key → string lookup (no interpolation machinery),
 * mirroring how `progressLine` composes its summary from parts.
 */
export function expandCount(template: string, count: number): string {
  return template.replace('{count}', String(count))
}
