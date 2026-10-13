import type { Context } from '@deepseek-ai/cordis';
/**
 * Register the deliverables projection as an optional contribution.
 *
 * @param ctx - the host context the plugin's `apply` receives.
 * @returns nothing; the registration's disposer rides the injected fiber, so
 *   unloading the plugin removes the key (clients then read capability absence).
 */
export declare function registerDeliverablesProjection(ctx: Context): void;
/**
 * Register the skill-usage projection as an optional contribution.
 *
 * @param ctx - the host context the plugin's `apply` receives.
 */
export declare function registerSkillUsageProjection(ctx: Context): void;
/**
 * Register the search-reference projection as an optional contribution.
 *
 * @param ctx - the host context the plugin's `apply` receives.
 */
export declare function registerSearchRefProjection(ctx: Context): void;
