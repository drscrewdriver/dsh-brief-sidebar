import type { Context } from '@deepseek-ai/cordis';
import type { BriefClientConfig, SettingsScopeSnapshot } from '../scope-face';
/**
 * Read one config switch, live.
 *
 * @param ctx - the client root context handed to the tab body.
 * @param resolve - pure snapshot → boolean resolver (owns the default).
 * @returns the resolved switch value.
 */
export declare function useConfigFlag(ctx: Context | undefined, resolve: (snapshot: SettingsScopeSnapshot<BriefClientConfig> | undefined) => boolean): boolean;
