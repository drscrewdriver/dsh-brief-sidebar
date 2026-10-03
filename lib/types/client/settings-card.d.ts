import type { ReactNode } from 'react';
import type { BriefClientConfig, SettingsScope } from './scope-face';
/** Injected face: the entry scope, plus the plugin's own binder. */
export interface BriefSettingsCardInjected {
    /** `configForms.get('dsh-brief-sidebar')` — may be unavailable on odd hosts. */
    scope?: SettingsScope<BriefClientConfig>;
    /** The plugin's locale binder (applied-time closure over the locale service). */
    t: (key: string) => string;
}
export type BriefSettingsCardProps = BriefSettingsCardInjected;
/**
 * The settings card body. `scope` is optional on purpose: the inject factory
 * always provides it, but a host whose `configForms` face degrades must not
 * crash the settings page — the card renders the unavailable note and keeps
 * its header.
 */
export declare function BriefSettingsCard(props: BriefSettingsCardProps): ReactNode;
