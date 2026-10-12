/**
 * The write channel back into `dsh-prime-memory`: rating one recalled memory.
 *
 * This is the FIRST write this plugin performs, and deliberately the only one.
 * Reading goes through the host's projection face (`memoryRecall`); there is no
 * projection for writes, so the mark travels over prime-memory's own client RPC
 * route — `POST /dsh-memory/rpc/<method>`, the same envelope its panel uses.
 * That is a cross-plugin HTTP contract, so everything that makes it safe to
 * hold lives here:
 *
 * - **Optional by construction.** A composition without dsh-prime-memory, or an
 *   older one without this endpoint, answers 404/405. That is reported as
 *   `absent`, and the section stops offering the control instead of failing on
 *   every click.
 * - **No invented semantics.** `-1` and `0..5` are prime-memory's domain; this
 *   module refuses anything else locally so a bad click cannot reach the server.
 * - **Nothing is optimistic about retirement.** The caller only hides a row
 *   after the server confirms `retired` — a lost request must not silently
 *   remove a memory from view.
 *
 * `fetch` is injected so the parse and the status mapping are testable without
 * a browser.
 */
/** The route prime-memory's server half registers for its client RPC surface. */
export declare const RECALL_FEEDBACK_ROUTE = "/dsh-memory/rpc/recall-feedback";
/** A relevance mark (`0..5`) or `-1` = "this is obsolete", prime-memory's domain. */
export declare const FEEDBACK_SCORES: readonly [-1, 0, 1, 2, 3, 4, 5];
export type FeedbackScore = (typeof FEEDBACK_SCORES)[number];
/** Whether a value is a score this plugin is allowed to send. */
export declare function isFeedbackScore(value: unknown): value is FeedbackScore;
/** How long to wait before giving up on one click. */
export declare const FEEDBACK_TIMEOUT_MS = 8000;
/**
 * Outcome of one rating attempt.
 *
 * `absent` is NOT an error to show the user — it means the capability is not
 * there (prime-memory missing or older), and the caller should stop offering
 * the control. `rejected` carries prime-memory's own reason (e.g. "this memory
 * is no longer in the session's recall set"), which is worth surfacing.
 */
export type FeedbackOutcome = {
    readonly status: 'sent';
    readonly retired: boolean;
    readonly announced: boolean;
    readonly mean: number;
    readonly rated: number;
} | {
    readonly status: 'rejected';
    readonly reason: string;
} | {
    readonly status: 'absent';
} | {
    readonly status: 'transport';
    readonly reason: string;
};
/** The minimal fetch shape this module needs (global `fetch` satisfies it). */
export interface FeedbackFetch {
    (url: string, init: {
        method: 'POST';
        headers: Record<string, string>;
        body: string;
        signal?: AbortSignal;
    }): Promise<{
        readonly ok: boolean;
        readonly status: number;
        json(): Promise<unknown>;
    }>;
}
export interface FeedbackRequest {
    readonly sessionId: string;
    readonly id: string;
    readonly score: FeedbackScore;
}
/**
 * Send one rating.
 *
 * Never throws: every failure mode comes back as a discriminated outcome, so a
 * click cannot break the render.
 */
export declare function sendRecallFeedback(fetchImpl: FeedbackFetch | undefined, request: FeedbackRequest): Promise<FeedbackOutcome>;
