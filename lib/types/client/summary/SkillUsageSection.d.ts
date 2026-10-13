import type { ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
export interface SkillUsageSectionProps {
    /** The DSH locale lookup, passed down from `apply`. */
    t: (key: string) => string;
    /** The client root context (the tab body's only way to reach services). */
    ctx?: Context;
    /** The session this tab is scoped to. */
    scope?: {
        readonly sessionId?: string;
    };
    /**
     * Drop the section header. The references tab already says “技能”, so
     * repeating it as a heading inside the pane is noise; standalone renders
     * (and every existing test) keep the default `false`.
     */
    hideHeader?: boolean;
}
/**
 * The skill-usage section. The subscription is unconditional (a plain listener,
 * not IO); the view decides whether anything is drawn.
 *
 * @param props - translation, client context, session scope.
 */
export declare function SkillUsageSection(props: SkillUsageSectionProps): ReactNode;
