import type { Context } from '@deepseek-ai/cordis';
/** Tab type id. Package-prefixed so it cannot collide with a built-in type. */
export declare const TAB_ID = "dsh-todo-sidebar:board";
/**
 * Position in the host's new-tab guide.
 *
 * Built-ins on this host generation sit at editor 10 / git 20 / subagent 30 /
 * sidechat 35 / terminal 40 / browser 50. 15 places a per-session task board
 * right after the editor, which is where a reader looks for session state.
 */
export declare const TAB_ORDER = 15;
/** Services required before `apply` runs. */
export declare const inject: string[];
/**
 * Browser-face apply.
 *
 * @param ctx - the client root context.
 */
export declare function apply(ctx: Context): void;
