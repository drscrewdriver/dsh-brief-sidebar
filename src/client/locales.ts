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
  'section.memorySlots': '记忆',
  'slots.empty': '当前没有激活的记忆槽位',
  'slots.emptyHint': '当 dsh-prime-memory 激活记忆槽位后，它们会实时出现在这里。',
  'slots.openCount': '开启 {count} 个槽位',
  'slots.status.open': '生效中',
  'slots.status.done': '已完成',
  'slots.status.dropped': '已弃置',
  'slots.status.expired': '已过期',
  'settings.title': '概要侧栏',
  'settings.desc': '右侧栏概要 tab 的分区开关（只读展示）。',
  'settings.memorySlots': '记忆槽位分区',
  'settings.memorySlotsHint': '开启后，概要 tab 在进展与产物之下显示 dsh-prime-memory 的激活记忆槽位（只读）。',
  'settings.unavailable': '配置面不可用，记忆分区按默认「开」处理。',
  'settings.readonly': '当前配置只读，无法在此修改。',
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
  'section.memorySlots': 'Memory',
  'slots.empty': 'No active memory slots',
  'slots.emptyHint': 'Slots appear here live once dsh-prime-memory activates them.',
  'slots.openCount': '{count} slots open',
  'slots.status.open': 'Open',
  'slots.status.done': 'Done',
  'slots.status.dropped': 'Dropped',
  'slots.status.expired': 'Expired',
  'settings.title': 'Brief sidebar',
  'settings.desc': 'Section switches for the summary tab in the right sidebar (read-only views).',
  'settings.memorySlots': 'Memory slots section',
  'settings.memorySlotsHint': 'When on, the summary tab lists the active memory slots from dsh-prime-memory beneath progress and produced files (read-only).',
  'settings.unavailable': 'The config face is unavailable; the memory section falls back to its default (on).',
  'settings.readonly': 'This config is read-only here; edits are not available.',
}

/** Japanese dictionary, checked complete against the zh key set. */
export const ja: Record<BriefKey, string> = {
  'tab.title': '概要',
  'tab.desc': 'このセッションのタスク・成果物・計画ファイル（読み取り専用）',
  'section.progress': '進行状況',
  'section.deliverables': '成果物',
  'board.empty': '現在タスクはありません',
  'board.emptyHint': 'モデルが todo_write を呼び出すと、タスクがここに表示されます。',
  'board.unavailable': 'タスクを利用できません',
  'board.unavailableHint':
    'このセッションはまだ todo データを受信していません。ホストが最初のフレームを送ると自動的に表示されます。',
  'status.pending': '未対応',
  'status.inProgress': '進行中',
  'status.completed': '完了',
  'deliverables.empty': 'このターンで変更されたファイルはありません',
  'deliverables.emptyHint': 'セッションでファイルの書き込み・変更が成功すると、ここにリアルタイムで表示されます。',
  'deliverables.sessionTotal': 'このセッションのファイル数: {count}',
  'deliverable.codeplanTag': '計画',
  'section.memorySlots': 'メモリ',
  'slots.empty': 'アクティブなメモリスロットはありません',
  'slots.emptyHint': 'dsh-prime-memory がスロットをアクティブにすると、ここにリアルタイムで表示されます。',
  'slots.openCount': '有効なスロット: {count} 件',
  'slots.status.open': '有効',
  'slots.status.done': '完了',
  'slots.status.dropped': '破棄',
  'slots.status.expired': '期限切れ',
  'settings.title': '概要サイドバー',
  'settings.desc': '右サイドバー概要タブのセクション表示切り替え（読み取り専用）。',
  'settings.memorySlots': 'メモリスロットセクション',
  'settings.memorySlotsHint': 'オンにすると、概要タブの進行状況と成果物の下に dsh-prime-memory のアクティブなメモリスロット（読み取り専用）が表示されます。',
  'settings.unavailable': '設定画面を利用できません。メモリセクションは既定（オン）で動作します。',
  'settings.readonly': 'この設定はここでは読み取り専用のため変更できません。',
}

/** Korean dictionary, checked complete against the zh key set. */
export const ko: Record<BriefKey, string> = {
  'tab.title': '요약',
  'tab.desc': '현재 세션의 작업, 산출물 및 계획 파일(읽기 전용)',
  'section.progress': '진행 상황',
  'section.deliverables': '산출물',
  'board.empty': '현재 작업이 없습니다',
  'board.emptyHint': '모델이 todo_write를 호출하면 작업이 여기에 표시됩니다.',
  'board.unavailable': '작업을 사용할 수 없습니다',
  'board.unavailableHint':
    '이 세션은 아직 todo 데이터를 받지 못했습니다. 호스트가 첫 프레임을 보내면 자동으로 표시됩니다.',
  'status.pending': '대기 중',
  'status.inProgress': '진행 중',
  'status.completed': '완료',
  'deliverables.empty': '이번 턴에 변경된 파일이 없습니다',
  'deliverables.emptyHint': '세션에서 파일을 성공적으로 작성하거나 수정하면 여기에 실시간으로 표시됩니다.',
  'deliverables.sessionTotal': '이 세션의 파일 {count}개',
  'deliverable.codeplanTag': '계획',
  'section.memorySlots': '메모리',
  'slots.empty': '활성화된 메모리 슬롯이 없습니다',
  'slots.emptyHint': 'dsh-prime-memory가 슬롯을 활성화하면 여기에 실시간으로 표시됩니다.',
  'slots.openCount': '열린 슬롯: {count}개',
  'slots.status.open': '활성',
  'slots.status.done': '완료',
  'slots.status.dropped': '폐기',
  'slots.status.expired': '만료',
  'settings.title': '요약 사이드바',
  'settings.desc': '오른쪽 사이드바 요약 탭의 섹션 표시 전환(읽기 전용).',
  'settings.memorySlots': '메모리 슬롯 섹션',
  'settings.memorySlotsHint': '켜면 요약 탭의 진행 상황과 산출물 아래에 dsh-prime-memory의 활성 메모리 슬롯(읽기 전용)이 표시됩니다.',
  'settings.unavailable': '설정 화면을 사용할 수 없어 메모리 섹션은 기본값(켜짐)으로 동작합니다.',
  'settings.readonly': '이 설정은 여기서 읽기 전용이므로 변경할 수 없습니다.',
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
  'section.memorySlots': 'Mémoire',
  'slots.empty': 'Aucun emplacement mémoire actif',
  'slots.emptyHint': 'Les emplacements apparaissent ici en direct dès que dsh-prime-memory les active.',
  'slots.openCount': '{count} emplacements ouverts',
  'slots.status.open': 'Actif',
  'slots.status.done': 'Terminé',
  'slots.status.dropped': 'Abandonné',
  'slots.status.expired': 'Expiré',
  'settings.title': 'Barre latérale Résumé',
  'settings.desc': 'Interrupteurs des sections de l’onglet Résumé de la barre latérale (lecture seule).',
  'settings.memorySlots': 'Section des emplacements mémoire',
  'settings.memorySlotsHint': 'Une fois activé, l’onglet Résumé liste les emplacements mémoire actifs de dsh-prime-memory sous l’avancement et les fichiers produits (lecture seule).',
  'settings.unavailable': 'Le canal de configuration est indisponible ; la section mémoire revient à sa valeur par défaut (activée).',
  'settings.readonly': 'Cette configuration est en lecture seule ici ; aucune modification possible.',
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
  'section.memorySlots': 'Gedächtnis',
  'slots.empty': 'Keine aktiven Speicherplätze',
  'slots.emptyHint': 'Sobald dsh-prime-memory Slots aktiviert, erscheinen sie hier in Echtzeit.',
  'slots.openCount': '{count} Slots offen',
  'slots.status.open': 'Offen',
  'slots.status.done': 'Erledigt',
  'slots.status.dropped': 'Verworfen',
  'slots.status.expired': 'Abgelaufen',
  'settings.title': 'Übersicht-Seitenleiste',
  'settings.desc': 'Schalter für die Abschnitte des Übersicht-Tabs in der rechten Seitenleiste (schreibgeschützt).',
  'settings.memorySlots': 'Speicherplätze-Abschnitt',
  'settings.memorySlotsHint': 'Ist der Schalter eingeschaltet, listet der Übersicht-Tab die aktiven Speicherplätze aus dsh-prime-memory unter Fortschritt und erzeugten Dateien auf (schreibgeschützt).',
  'settings.unavailable': 'Die Konfigurationsoberfläche ist nicht verfügbar; der Gedächtnis-Abschnitt fällt auf den Standard (ein) zurück.',
  'settings.readonly': 'Diese Konfiguration ist hier schreibgeschützt; Änderungen sind nicht möglich.',
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
  'section.memorySlots': 'Memoria',
  'slots.empty': 'Nessuno slot di memoria attivo',
  'slots.emptyHint': 'Gli slot appaiono qui in tempo reale quando dsh-prime-memory li attiva.',
  'slots.openCount': '{count} slot aperti',
  'slots.status.open': 'Attivo',
  'slots.status.done': 'Completato',
  'slots.status.dropped': 'Scartato',
  'slots.status.expired': 'Scaduto',
  'settings.title': 'Barra laterale Riepilogo',
  'settings.desc': 'Interruttori delle sezioni della scheda Riepilogo nella barra laterale destra (sola lettura).',
  'settings.memorySlots': 'Sezione slot di memoria',
  'settings.memorySlotsHint': 'Quando attivo, la scheda Riepilogo elenca gli slot di memoria attivi di dsh-prime-memory sotto avanzamento e file prodotti (sola lettura).',
  'settings.unavailable': 'La superficie di configurazione non è disponibile; la sezione memoria torna al valore predefinito (attivo).',
  'settings.readonly': 'Questa configurazione è in sola lettura qui; non è possibile modificarla.',
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
  'section.memorySlots': 'Память',
  'slots.empty': 'Активных слотов памяти нет',
  'slots.emptyHint': 'Как только dsh-prime-memory активирует слоты, они появляются здесь в реальном времени.',
  'slots.openCount': 'Открытых слотов: {count}',
  'slots.status.open': 'Активен',
  'slots.status.done': 'Завершён',
  'slots.status.dropped': 'Отброшен',
  'slots.status.expired': 'Истёк',
  'settings.title': 'Боковая панель «Сводка»',
  'settings.desc': 'Переключатели разделов вкладки «Сводка» на правой панели (только чтение).',
  'settings.memorySlots': 'Раздел слотов памяти',
  'settings.memorySlotsHint': 'Когда включено, вкладка «Сводка» показывает активные слоты памяти из dsh-prime-memory под ходом работы и созданными файлами (только чтение).',
  'settings.unavailable': 'Панель конфигурации недоступна; раздел памяти работает по умолчанию (включён).',
  'settings.readonly': 'Эта конфигурация здесь только для чтения; изменить её нельзя.',
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
  'section.memorySlots': 'Memoria',
  'slots.empty': 'No hay ranuras de memoria activas',
  'slots.emptyHint': 'Las ranuras aparecen aquí en directo en cuanto dsh-prime-memory las active.',
  'slots.openCount': '{count} ranuras abiertas',
  'slots.status.open': 'Activa',
  'slots.status.done': 'Hecha',
  'slots.status.dropped': 'Descartada',
  'slots.status.expired': 'Caducada',
  'settings.title': 'Barra lateral Resumen',
  'settings.desc': 'Interruptores de las secciones de la pestaña Resumen en la barra lateral derecha (solo lectura).',
  'settings.memorySlots': 'Sección de ranuras de memoria',
  'settings.memorySlotsHint': 'Al activarla, la pestaña Resumen enumera las ranuras de memoria activas de dsh-prime-memory bajo el avance y los archivos generados (solo lectura).',
  'settings.unavailable': 'La superficie de configuración no está disponible; la sección de memoria vuelve a su valor por defecto (activada).',
  'settings.readonly': 'Esta configuración es de solo lectura aquí; no se puede modificar.',
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
  ja,
  ko,
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
