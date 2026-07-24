'use client';

import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from 'react';
import { pick, tr, type Lang } from '@/lib/locale';

interface LangCtx {
    /** The active language — flips instantly on toggle (no server round-trip). */
    lang: Lang;
    setLang: (next: Lang) => void;
    /** Kept for API compatibility; always false now (no background refetch). */
    pending: boolean;
}

const LanguageContext = createContext<LangCtx | null>(null);

/**
 * Holds the storefront language on the client. Every translatable component
 * reads it via `useLang()` (or the <Tr>/<T> leaves), so switching re-renders
 * them instantly — no backend refetch. The API already returns both languages,
 * so a toggle is a pure client re-pick; we only persist the cookie so the next
 * server render (a real navigation) starts in the chosen language.
 */
export function LanguageProvider({
    initial,
    children,
}: {
    initial: Lang;
    children: ReactNode;
}) {
    const [lang, setLangState] = useState<Lang>(initial);

    function setLang(next: Lang) {
        if (next === lang) return;
        setLangState(next); // instant — every client consumer re-renders now
        document.cookie = `lang=${next};path=/;max-age=31536000`;
    }

    return (
        <LanguageContext.Provider value={{ lang, setLang, pending: false }}>
            {children}
        </LanguageContext.Provider>
    );
}

/** Read the active language + setter. Falls back to a default outside the
 *  provider so non-wrapped client components don't crash. */
export function useLang(fallback: Lang = 'en'): LangCtx {
    const ctx = useContext(LanguageContext);
    if (ctx) return ctx;
    return { lang: fallback, setLang: () => {}, pending: false };
}

/**
 * Reactive translated string — a leaf client component usable inside SERVER
 * components. It's server-rendered for the initial page (so SEO/first paint are
 * intact) and re-renders instantly on a client language switch, without any
 * backend refetch. Use in place of `{tr(lang, key)}`.
 */
export function Tr({ k }: { k: string }) {
    const { lang } = useLang();
    return <>{tr(lang, k)}</>;
}

/** Reactive bilingual value — the client counterpart of `pick(lang, en, km)`. */
export function T({ en, km }: { en: string; km: string }) {
    const { lang } = useLang();
    return <>{pick(lang, en, km)}</>;
}
