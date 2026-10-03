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
export declare const NS = "dsh-brief-sidebar";
/** Simplified Chinese dictionary — the key-set source of truth. */
export declare const zh: {
    'tab.title': string;
    'tab.desc': string;
    'section.progress': string;
    'section.deliverables': string;
    'board.empty': string;
    'board.emptyHint': string;
    'board.unavailable': string;
    'board.unavailableHint': string;
    'status.pending': string;
    'status.inProgress': string;
    'status.completed': string;
    'deliverables.empty': string;
    'deliverables.emptyHint': string;
    'deliverables.sessionTotal': string;
    'deliverable.codeplanTag': string;
};
/** The key union: what a `t('…')` call may name inside this namespace. */
export type BriefKey = keyof typeof zh;
/** English dictionary, checked complete against the zh key set. */
export declare const en: Record<BriefKey, string>;
/** Japanese dictionary, checked complete against the zh key set. */
export declare const ja: Record<BriefKey, string>;
/** Korean dictionary, checked complete against the zh key set. */
export declare const ko: Record<BriefKey, string>;
/** French dictionary, checked complete against the zh key set. */
export declare const fr: Record<BriefKey, string>;
/** German dictionary, checked complete against the zh key set. */
export declare const de: Record<BriefKey, string>;
/** Italian dictionary, checked complete against the zh key set. */
export declare const it: Record<BriefKey, string>;
/** Russian dictionary, checked complete against the zh key set. */
export declare const ru: Record<BriefKey, string>;
/** Spanish dictionary, checked complete against the zh key set. */
export declare const es: Record<BriefKey, string>;
/**
 * All locales in the shape the locale service consumes. Registered in ONE call:
 * the registry rejects a duplicate `(namespace, locale)` pair and the
 * per-locale form would leave a half-registered namespace if a later call
 * threw. `zh`/`en` are the host built-ins; the fr/de/it/ru/es pack rides the
 * same map form (every id is a valid BCP 47-style tag, so the registry accepts
 * it as-is).
 */
export declare const dictionaries: Record<string, Record<string, string>>;
/**
 * Expand the one `{count}` placeholder the deliverables totals line uses. The
 * locale binder is a plain key → string lookup (no interpolation machinery),
 * mirroring how `progressLine` composes its summary from parts.
 */
export declare function expandCount(template: string, count: number): string;
