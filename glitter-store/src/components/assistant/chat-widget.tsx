'use client';

/* eslint-disable react-hooks/set-state-in-effect */
import { SafeImg } from '@/components/ui/safe-img';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    ArrowUp,
    ChevronRight,
    CreditCard,
    Maximize2,
    Minimize2,
    Package,
    SquarePen,
    Truck,
    X,
} from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';
import { sendChat, type ChatMessage, type ChatProduct } from '@/lib/chat';
import type { StoreAssistant } from '@/lib/store-config';
import {
    AssistantIcon,
    isAssistantIconId,
    type AssistantIconId,
} from '@/components/assistant/assistant-icons';

/** The assistant's look (icon + colour) from App settings. */
const AssistantLook = createContext<StoreAssistant>({
    icon: 'buddy',
    color: '',
});

const STORAGE_KEY = 'glitter-chat-v1';
const LAUNCHER_POS_KEY = 'glitter-chat-launcher-pos';

/** Quick-start suggestions shown on the home screen (icon + localized prompt). */
const SUGGESTIONS = [
    { key: 'chatQ1', Icon: Truck },
    { key: 'chatQ2', Icon: CreditCard },
    { key: 'chatQ3', Icon: Package },
] as const;

/**
 * Floating storefront shopping assistant. A logo button opens a panel with a
 * branded gradient "home" screen (greeting + suggestions) that flows into a
 * chat once the customer asks something. Full-screen sheet on mobile, floating
 * card on desktop. Talks to `POST /api/ai/chat` via `authFetch`.
 */
export function ChatWidget({
    assistant = { icon: 'buddy', color: '' },
    ...props
}: {
    lang: Lang;
    logoUrl?: string | null;
    brandName?: string;
    assistant?: StoreAssistant;
}) {
    const preview = usePreviewMode();
    const look: StoreAssistant = preview
        ? {
              icon: preview.icon ?? assistant.icon,
              color: preview.color ?? assistant.color,
          }
        : assistant;
    return (
        <AssistantLook.Provider value={look}>
            <ChatWidgetInner {...props} preview={preview?.view ?? null} />
        </AssistantLook.Provider>
    );
}

type PreviewView = 'chat' | 'button';
interface PreviewState {
    view: PreviewView;
    icon?: AssistantIconId;
    color?: string;
}

/**
 * Dashboard preview (App settings → AI assistant) loads the real store in an
 * iframe with `?aiPreview=chat|button&aiIcon=…&aiColor=…`, then sends live
 * changes with postMessage. Only affects that viewer's screen; nothing is
 * saved and no message is sent to the AI.
 */
function usePreviewMode(): PreviewState | null {
    const [state, setState] = useState<PreviewState | null>(null);
    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const view = q.get('aiPreview');
        if (view !== 'chat' && view !== 'button') return;
        const parse = (raw: {
            view?: unknown;
            icon?: unknown;
            color?: unknown;
        }): Partial<PreviewState> => ({
            ...(raw.view === 'chat' || raw.view === 'button'
                ? { view: raw.view }
                : {}),
            ...(isAssistantIconId(raw.icon) ? { icon: raw.icon } : {}),
            ...(typeof raw.color === 'string' &&
            /^#[0-9a-f]{6}$/i.test(raw.color)
                ? { color: raw.color }
                : {}),
        });
        setState({
            view,
            ...parse({ icon: q.get('aiIcon'), color: q.get('aiColor') }),
        });
        function onMessage(e: MessageEvent) {
            const d = e.data as { type?: string } | null;
            if (d?.type !== 'glitter-ai-preview') return;
            setState((prev) =>
                prev
                    ? { ...prev, ...parse(d as Record<string, unknown>) }
                    : prev,
            );
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);
    return state;
}

/** A short sample conversation shown in the dashboard preview. */
function demoConversation(lang: Lang): ChatMessage[] {
    return [
        { role: 'user', content: tr(lang, 'chatDemoQ') },
        {
            role: 'model',
            content: tr(lang, 'chatDemoA'),
            suggestions: [tr(lang, 'chatQ2'), tr(lang, 'chatDemoS')],
        },
    ];
}

function ChatWidgetInner({
    lang: initialLang,
    brandName,
    preview = null,
}: {
    lang: Lang;
    /** Dashboard preview: open state is driven from outside, nothing is sent. */
    preview?: PreviewView | null;
    /** Kept for API compatibility; the assistant icon is used instead. */
    logoUrl?: string | null;
    brandName?: string;
}) {
    const { lang } = useLang(initialLang);
    const { authFetch, user } = useAuth();
    const look = useContext(AssistantLook);

    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Mobile swipe-to-dismiss (drag the sheet down to close).
    const [dragY, setDragY] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [entered, setEntered] = useState(false);
    const dragStartRef = useRef<number | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const firstName = user?.fullName?.trim().split(' ')[0] ?? '';
    const started = messages.length > 0;

    // Follow-up chips: contextual suggestions based on the last question, shown
    // once the assistant has replied (and isn't currently typing).
    const lastMsg = messages[messages.length - 1];
    const lastUserMsg = [...messages]
        .reverse()
        .find((m) => m.role === 'user')?.content;
    // Prefer the AI's contextual follow-ups; fall back to keyword-based ones
    // (e.g. if the model omitted them or the request errored).
    // Only use the AI's chips if they're in the language the store is shown
    // in now (saved chats keep their old chips; the shopper may have switched
    // language since) — otherwise use the localized topic-based ones.
    const aiChips =
        lastMsg?.suggestions?.filter(
            (q) => (/[\u1780-\u17FF]/.test(q) ? 'km' : 'en') === lang,
        ) ?? [];
    const rawFollowUps =
        !loading && lastMsg?.role === 'model'
            ? aiChips.length > 0
                ? aiChips
                : lastUserMsg
                  ? getFollowUps(lastUserMsg, lang)
                  : []
            : [];
    // Never suggest something the customer already asked (normalise & dedupe).
    const askedNorm = new Set(
        messages
            .filter((m) => m.role === 'user')
            .map((m) => normalizeQ(m.content)),
    );
    const seen = new Set<string>();
    const followUps = rawFollowUps.filter((q) => {
        const n = normalizeQ(q);
        if (askedNorm.has(n) || seen.has(n)) return false;
        seen.add(n);
        return true;
    });

    // Dashboard preview: show the requested state with a sample chat.
    useEffect(() => {
        if (!preview) return;
        setOpen(preview === 'chat');
        setMessages(demoConversation(lang));
    }, [preview, lang]);

    // Restore the transcript so it survives navigation between pages.
    useEffect(() => {
        if (new URLSearchParams(window.location.search).has('aiPreview'))
            return;
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) setMessages(JSON.parse(saved) as ChatMessage[]);
        } catch {
            /* ignore */
        }
    }, []);

    // Close on Escape, and lock the page scroll while open (so the background
    // can't scroll behind the panel — native-app feel).
    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    // Persist + autoscroll whenever the transcript changes.
    useEffect(() => {
        if (messages.length > 0 && !preview) {
            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
            } catch {
                /* ignore */
            }
        }
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }, [messages, loading, preview]);

    // Opening the chat → jump straight to the latest message (no animation).
    // Run again shortly after, once product images have loaded and grown the
    // list.
    useEffect(() => {
        if (!open) return;
        const toBottom = () => {
            const el = scrollRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        };
        const raf = requestAnimationFrame(toBottom);
        const late = setTimeout(toBottom, 350);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(late);
        };
    }, [open]);

    async function send(text: string) {
        const content = text.trim();
        if (!content || loading || preview) return;

        const next: ChatMessage[] = [...messages, { role: 'user', content }];
        setMessages(next);
        setInput('');
        setError(null);
        setLoading(true);
        try {
            const reply = await sendChat(
                authFetch,
                next.map((m) => ({ role: m.role, content: m.content })),
                lang,
            );
            setMessages((prev) => [
                ...prev,
                {
                    role: 'model',
                    content: reply.reply,
                    products: reply.products,
                    suggestions: reply.suggestions,
                },
            ]);
        } catch (e) {
            const kind = e instanceof Error ? e.message : 'error';
            setError(tr(lang, kind === 'rate' ? 'chatRate' : 'chatError'));
        } finally {
            setLoading(false);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }

    function reset() {
        setMessages([]);
        setError(null);
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            /* ignore */
        }
    }

    // Let the open animation finish, then disable it so the drag transform can
    // take over (a filled CSS animation would otherwise override inline style).
    useEffect(() => {
        if (!open) {
            setEntered(false);
            setDragY(0);
            return;
        }
        const t = setTimeout(() => setEntered(true), 380);
        return () => clearTimeout(t);
    }, [open]);

    // Swipe-down-to-close handlers (mobile drag handle).
    function onSwipeDown(e: React.PointerEvent<HTMLDivElement>) {
        dragStartRef.current = e.clientY;
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    }
    function onSwipeMove(e: React.PointerEvent<HTMLDivElement>) {
        if (dragStartRef.current == null) return;
        setDragY(Math.max(0, e.clientY - dragStartRef.current));
    }
    function onSwipeEnd() {
        setDragging(false);
        if (dragY > 110) setOpen(false);
        setDragY(0);
        dragStartRef.current = null;
    }

    // ---- Launcher button (panel closed) -------------------------------------
    if (!open) {
        return (
            <DraggableLauncher
                onOpen={() => setOpen(true)}
                ariaLabel={tr(lang, 'chatOpen')}
            />
        );
    }

    // ---- Composer -------------------------------------------------------------
    const composer = (
        <div className="shrink-0 bg-white px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 dark:bg-zinc-950">
            <div className="flex items-end gap-2 rounded-[22px] border border-zinc-200 bg-zinc-50 py-1.5 pl-4 pr-1.5 transition-all focus-within:border-(--ai) focus-within:bg-white focus-within:ring-4 focus-within:ring-(--ai)/10 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:bg-zinc-900">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        // Grow with the text, up to ~5 lines.
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void send(input);
                        }
                    }}
                    rows={1}
                    placeholder={tr(lang, 'chatPlaceholder')}
                    className="max-h-30 min-h-9 flex-1 resize-none bg-transparent py-2 text-[15px] leading-5 text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
                <button
                    type="button"
                    onClick={() => void send(input)}
                    disabled={!input.trim() || loading}
                    aria-label={tr(lang, 'chatSend')}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--ai) text-white shadow-sm transition-all hover:brightness-110 active:scale-90 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
                >
                    <ArrowUp className="size-4.5" strokeWidth={2.5} />
                </button>
            </div>
            <p className="mt-1.5 select-none text-center text-[10.5px] text-zinc-400 dark:text-zinc-500">
                {tr(lang, 'chatDisclaimer')}
            </p>
        </div>
    );

    // Desktop: floating card (or a larger centred window when expanded).
    // Phones: a tall bottom sheet.
    // Dashboard preview: the chat fills the whole (small) screen — no sheet
    // corners with the page peeking around them.
    const panelClass = preview
        ? 'fixed inset-0 z-50 flex flex-col overflow-hidden bg-white dark:bg-zinc-950'
        : [
              'chat-panel fixed z-50 flex flex-col overflow-hidden bg-white dark:bg-zinc-950',
              'inset-x-0 bottom-0 top-[7vh] rounded-t-[28px]',
              'md:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)] md:ring-1 md:ring-black/5 md:dark:ring-white/10',
              expanded
                  ? 'md:inset-0 md:m-auto md:h-[88vh] md:max-h-[900px] md:w-[min(92vw,820px)] md:rounded-[28px]'
                  : 'md:inset-auto md:bottom-6 md:right-6 md:top-auto md:h-[min(680px,calc(100vh-3rem))] md:w-[400px] md:rounded-[28px]',
          ].join(' ');

    const iconBtn =
        'flex size-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

    // ---- Panel (open) -------------------------------------------------------
    return (
        <>
            {/* Backdrop — dims the page; tap outside to close. */}
            {!preview && (
                <button
                    type="button"
                    aria-label={tr(lang, 'chatClose')}
                    onClick={() => setOpen(false)}
                    className="chat-backdrop fixed inset-0 z-50 cursor-default bg-zinc-950/40 backdrop-blur-[2px] md:bg-zinc-950/20"
                />
            )}
            <div
                className={panelClass}
                style={{
                    ['--ai' as string]: look.color || 'var(--brand)',
                    transform: dragY ? `translateY(${dragY}px)` : undefined,
                    transition: dragging
                        ? 'none'
                        : 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
                    animation: entered ? 'none' : undefined,
                }}
            >
                {/* Phone drag handle — swipe down to close. */}
                {!preview && (
                    <div
                        onPointerDown={onSwipeDown}
                        onPointerMove={onSwipeMove}
                        onPointerUp={onSwipeEnd}
                        onPointerCancel={onSwipeEnd}
                        aria-hidden
                        className="flex h-5 shrink-0 touch-none cursor-grab items-end justify-center md:hidden"
                    >
                        <span className="h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    </div>
                )}

                {/* Header */}
                <div
                    className={`flex shrink-0 items-center gap-3 border-b border-zinc-100 px-4 pb-3 dark:border-zinc-800/80 ${
                        preview ? 'pt-4' : 'pt-2 md:pt-3.5'
                    }`}
                >
                    <span className="relative shrink-0">
                        <AiOrb className="size-10" />
                        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                            {tr(lang, 'chatTitle')}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {brandName ? `${brandName} · ` : ''}
                            {tr(lang, 'chatOnline')}
                        </p>
                    </div>
                    {started && (
                        <button
                            type="button"
                            onClick={reset}
                            aria-label={tr(lang, 'chatReset')}
                            title={tr(lang, 'chatReset')}
                            className={iconBtn}
                        >
                            <SquarePen className="size-4.5" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        aria-label={tr(
                            lang,
                            expanded ? 'chatCollapse' : 'chatExpand',
                        )}
                        className={`${iconBtn} hidden md:flex`}
                    >
                        {expanded ? (
                            <Minimize2 className="size-4" />
                        ) : (
                            <Maximize2 className="size-4" />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label={tr(lang, 'chatClose')}
                        className={iconBtn}
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div
                    ref={scrollRef}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                >
                    {started ? (
                        /* ---- Conversation ---- */
                        <div
                            className={`space-y-4 px-4 py-5 ${expanded ? 'md:mx-auto md:max-w-2xl' : ''}`}
                        >
                            {messages.map((m, i) => (
                                <Bubble
                                    key={i}
                                    message={m}
                                    lang={lang}
                                    onNavigate={() => setOpen(false)}
                                />
                            ))}
                            {loading && (
                                <TypingBubble
                                    label={tr(lang, 'chatThinking')}
                                />
                            )}
                            {error && (
                                <div className="ml-9 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                                    {error}
                                </div>
                            )}
                            {/* Quick replies — tap instead of typing. */}
                            {followUps.length > 0 && (
                                <div className="flex flex-wrap gap-2 pl-9">
                                    {followUps.map((q) => (
                                        <button
                                            key={q}
                                            type="button"
                                            onClick={() => void send(q)}
                                            className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-zinc-700 transition-all hover:border-(--ai) hover:text-(--ai) active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ---- Home ---- */
                        <div
                            className={`flex min-h-full flex-col px-5 pb-4 pt-8 ${expanded ? 'md:mx-auto md:max-w-xl' : ''}`}
                        >
                            <div className="flex flex-col items-center text-center">
                                <span className="relative">
                                    <AiOrb className="size-16" />
                                </span>
                                <h2 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                                    {tr(lang, 'chatHello')}
                                    {firstName ? `, ${firstName}` : ''} 👋
                                </h2>
                                <p className="mt-1 text-[15px] text-zinc-500 dark:text-zinc-400">
                                    {tr(lang, 'chatHelp')}
                                </p>
                            </div>

                            <div className="mt-8">
                                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    {tr(lang, 'chatSuggested')}
                                </p>
                                <div className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                    {SUGGESTIONS.map(({ key, Icon }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() =>
                                                void send(tr(lang, key))
                                            }
                                            className="group flex w-full items-center gap-3 border-b border-zinc-100 bg-white px-3.5 py-3 text-left transition-colors last:border-0 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                                        >
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--ai)/10 text-(--ai)">
                                                <Icon className="size-4.5" />
                                            </span>
                                            <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                                                {tr(lang, key)}
                                            </span>
                                            <ChevronRight className="size-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-(--ai) dark:text-zinc-600" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {composer}
            </div>
        </>
    );
}

// ---- Avatar -----------------------------------------------------------------

function Avatar({ className = '' }: { className?: string }) {
    return (
        <AiOrb animated={false} className={className || 'size-7 shrink-0'} />
    );
}

// ---- Message bubble ---------------------------------------------------------

function Bubble({
    message,
    lang,
    onNavigate,
}: {
    message: ChatMessage;
    lang: Lang;
    onNavigate?: () => void;
}) {
    if (message.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[80%] whitespace-pre-wrap rounded-[20px] rounded-br-md bg-(--ai) px-4 py-2.5 text-[14.5px] leading-relaxed text-white">
                    {message.content}
                </div>
            </div>
        );
    }
    return (
        <div className="flex items-start gap-2">
            <Avatar className="mt-0.5 size-7 shrink-0" />
            <div className="min-w-0 max-w-[85%] space-y-2.5">
                <div className="rounded-[20px] rounded-tl-md bg-zinc-100 px-4 py-2.5 text-[14.5px] leading-relaxed text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-100">
                    <RichText text={message.content} />
                </div>
                {message.products && message.products.length > 0 && (
                    <div className="-mr-4 flex snap-x gap-2.5 overflow-x-auto pb-1 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {message.products.map((p) => (
                            <ProductCard
                                key={p.slug}
                                product={p}
                                lang={lang}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/** Renders a tiny, safe Markdown subset from the assistant — **bold**, "- "
 *  bullet lists, and blank-line paragraph breaks — so replies read cleanly
 *  without pulling in a full Markdown library. Text is never set as raw HTML. */
function RichText({ text }: { text: string }) {
    const lines = text.split('\n');
    const nodes: React.ReactNode[] = [];
    let bullets: string[] = [];

    const flushBullets = () => {
        if (bullets.length === 0) return;
        nodes.push(
            <ul
                key={`ul-${nodes.length}`}
                className="my-1 list-disc space-y-0.5 pl-4 marker:text-(--ai)"
            >
                {bullets.map((b, i) => (
                    <li key={i}>{renderInline(b)}</li>
                ))}
            </ul>,
        );
        bullets = [];
    };

    lines.forEach((raw) => {
        const line = raw.replace(/\s+$/, '');
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        if (bullet) {
            bullets.push(bullet[1]);
            return;
        }
        flushBullets();
        if (line.trim() === '') return; // blank line → paragraph gap via space-y
        nodes.push(<p key={`p-${nodes.length}`}>{renderInline(line)}</p>);
    });
    flushBullets();

    return <div className="space-y-1.5">{nodes}</div>;
}

/** Split a line into plain text + **bold** runs. */
function renderInline(text: string): React.ReactNode[] {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        return bold ? (
            <strong key={i} className="font-semibold">
                {bold[1]}
            </strong>
        ) : (
            <span key={i}>{part}</span>
        );
    });
}

function ProductCard({
    product,
    lang,
    onNavigate,
}: {
    product: ChatProduct;
    lang: Lang;
    onNavigate?: () => void;
}) {
    const img = fileUrl(product.imageUrl);
    return (
        <Link
            href={`/products/${product.slug}`}
            onClick={onNavigate}
            className="group w-36 shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-100 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
        >
            <span className="block aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {img && (
                    <SafeImg
                        src={img}
                        alt={product.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                )}
            </span>
            <span className="block p-2.5">
                <span className="line-clamp-2 min-h-8 text-xs font-medium leading-4 text-zinc-800 dark:text-zinc-100">
                    {product.name}
                </span>
                <span className="mt-1.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        ${product.price.toFixed(2)}
                    </span>
                    <span className="text-[11px] font-semibold text-(--ai)">
                        {tr(lang, 'chatView')} →
                    </span>
                </span>
            </span>
        </Link>
    );
}

function TypingBubble({ label }: { label: string }) {
    return (
        <div className="flex items-start gap-2">
            <Avatar className="mt-0.5 size-7 shrink-0" />
            <div className="flex items-center gap-1 rounded-[20px] rounded-tl-md bg-zinc-100 px-4 py-3.5 dark:bg-zinc-800/80">
                <span className="sr-only">{label}</span>
                <Dot delay="0ms" />
                <Dot delay="160ms" />
                <Dot delay="320ms" />
            </div>
        </div>
    );
}

function Dot({ delay }: { delay: string }) {
    return (
        <span
            className="size-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
            style={{ animationDelay: delay }}
        />
    );
}

type Side = 'left' | 'right';
interface LauncherSpot {
    side: Side;
    /** Distance from the top of the viewport, in px. */
    y: number;
}

const LAUNCHER_SIZE = 56;
const EDGE = 16; // gap from the screen edge

/** Keep the launcher clear of the sticky header and (on phones) the tab bar. */
function launcherBounds() {
    const phone = window.innerWidth < 768;
    const top = phone ? 72 : 88;
    const bottom = window.innerHeight - LAUNCHER_SIZE - (phone ? 88 : 24);
    return { top, bottom: Math.max(top, bottom) };
}

function placeAt(spot: LauncherSpot) {
    const { top, bottom } = launcherBounds();
    return {
        x:
            spot.side === 'left'
                ? EDGE
                : window.innerWidth - LAUNCHER_SIZE - EDGE,
        y: Math.min(Math.max(spot.y, top), bottom),
    };
}

/**
 * The floating AI button. Tap to open; drag to move it anywhere — on release
 * it snaps to the nearest LEFT or RIGHT edge (never left floating over the
 * middle of the page) and stays clear of the header and the phone tab bar.
 * The spot is remembered per browser.
 */
function DraggableLauncher({
    onOpen,
    ariaLabel,
}: {
    onOpen: () => void;
    ariaLabel: string;
}) {
    const [spot, setSpot] = useState<LauncherSpot | null>(null);
    // Free position while the finger/mouse is down; null when resting.
    const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(
        null,
    );
    const [, forceLayout] = useState(0);
    const btnRef = useRef<HTMLButtonElement>(null);
    const startRef = useRef({ x: 0, y: 0 });
    const offsetRef = useRef({ x: 0, y: 0 });
    const movedRef = useRef(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(LAUNCHER_POS_KEY);
            if (raw) {
                const saved = JSON.parse(raw) as Partial<LauncherSpot> & {
                    x?: number;
                };
                // Older saves stored a free {x, y}: snap them to an edge.
                const side: Side =
                    saved.side ??
                    ((saved.x ?? window.innerWidth) < window.innerWidth / 2
                        ? 'left'
                        : 'right');
                if (typeof saved.y === 'number') setSpot({ side, y: saved.y });
            }
        } catch {
            /* ignore */
        }
        // Re-place on resize / rotation (the spot itself is kept).
        const onResize = () => forceLayout((n) => n + 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    function onDown(e: React.PointerEvent<HTMLButtonElement>) {
        const el = btnRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        startRef.current = { x: e.clientX, y: e.clientY };
        offsetRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        movedRef.current = false;
        el.setPointerCapture(e.pointerId);
    }
    function onMove(e: React.PointerEvent<HTMLButtonElement>) {
        if (!btnRef.current?.hasPointerCapture(e.pointerId)) return;
        const dx = e.clientX - startRef.current.x;
        const dy = e.clientY - startRef.current.y;
        if (!movedRef.current && Math.hypot(dx, dy) < 6) return; // ignore jitter
        movedRef.current = true;
        setDragPos({
            x: Math.min(
                Math.max(e.clientX - offsetRef.current.x, 0),
                window.innerWidth - LAUNCHER_SIZE,
            ),
            y: Math.min(
                Math.max(e.clientY - offsetRef.current.y, 0),
                window.innerHeight - LAUNCHER_SIZE,
            ),
        });
    }
    function onUp(e: React.PointerEvent<HTMLButtonElement>) {
        try {
            btnRef.current?.releasePointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        if (movedRef.current && dragPos) {
            // Snap to whichever side is closer.
            const centre = dragPos.x + LAUNCHER_SIZE / 2;
            const next: LauncherSpot = {
                side: centre < window.innerWidth / 2 ? 'left' : 'right',
                y: placeAt({ side: 'right', y: dragPos.y }).y,
            };
            setSpot(next);
            try {
                localStorage.setItem(LAUNCHER_POS_KEY, JSON.stringify(next));
            } catch {
                /* ignore */
            }
        }
        setDragPos(null);
    }
    function onClick() {
        if (movedRef.current) {
            movedRef.current = false; // it was a drag, not a tap — don't open
            return;
        }
        onOpen();
    }

    const resting = spot ? placeAt(spot) : null;
    const pos = dragPos ?? resting;
    const style: React.CSSProperties | undefined = pos
        ? {
              left: pos.x,
              top: pos.y,
              right: 'auto',
              bottom: 'auto',
              // Glide to the edge on release; follow the finger exactly while dragging.
              transition: dragPos
                  ? 'none'
                  : 'left 0.35s cubic-bezier(0.32,0.72,0,1), top 0.35s cubic-bezier(0.32,0.72,0,1)',
          }
        : undefined;
    const cornerClass = pos ? '' : 'right-4 bottom-24 md:right-6 md:bottom-6';

    return (
        <button
            ref={btnRef}
            type="button"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onClick={onClick}
            aria-label={ariaLabel}
            title={ariaLabel}
            style={style}
            className={`group fixed z-50 size-14 touch-none select-none rounded-full outline-none focus-visible:ring-4 focus-visible:ring-(--brand)/30 ${
                dragPos ? 'scale-110 cursor-grabbing' : 'cursor-grab'
            } ${cornerClass}`}
        >
            <AiOrb shadow className="size-14" />
        </button>
    );
}

/** The assistant's icon in the colour chosen in App settings. */
function AiOrb({
    className = '',
    animated = true,
    shadow = false,
}: {
    className?: string;
    animated?: boolean;
    shadow?: boolean;
}) {
    const look = useContext(AssistantLook);
    return (
        <AssistantIcon
            icon={look.icon}
            color={look.color}
            animated={animated}
            shadow={shadow}
            className={className}
        />
    );
}

/** Normalise a question for comparison: lowercase, strip punctuation/spaces
 *  (incl. the Khmer "។" and "?") so "How do I pay?" == "how do i pay". */
function normalizeQ(text: string): string {
    return text
        .toLowerCase()
        .replace(/[\s?？.!,។៕]+/g, '')
        .trim();
}

/** Contextual follow-up suggestions from the last question's topic, so the
 *  customer can tap a related question instead of typing it. */
function getFollowUps(lastUser: string, lang: Lang): string[] {
    const t = lastUser.toLowerCase();
    const has = (...kw: string[]) => kw.some((k) => t.includes(k));
    const km = lang === 'km';

    if (has('deliver', 'shipping', 'ship', 'ដឹក', 'ជញ្ជូន'))
        return km
            ? ['តម្លៃដឹកជញ្ជូនប៉ុន្មាន?', 'ដឹកទៅខេត្តបានទេ?', 'របៀបទូទាត់?']
            : [
                  'How much is delivery?',
                  'Do you deliver to province?',
                  'How do I pay?',
              ];
    if (has('pay', 'khqr', 'cash', 'aba', 'បង់', 'ទូទាត់', 'លុយ'))
        return km
            ? ['ទទួល KHQR ទេ?', 'បង់សាច់ប្រាក់បានទេ?', 'ជម្រើសដឹកជញ្ជូន?']
            : ['Do you accept KHQR?', 'Can I pay cash?', 'Delivery options?'];
    if (has('order', 'status', 'track', 'កម្មង់', 'បញ្ជាទិញ', 'ស្ថានភាព'))
        return km
            ? ['ការបញ្ជាទិញរបស់ខ្ញុំនៅឯណា?', 'របៀបតាមដានការបញ្ជាទិញ?']
            : ['Where is my order?', 'How do I track my order?'];
    if (
        has(
            'branch',
            'location',
            'where',
            'address',
            'hour',
            'open',
            'សាខា',
            'ទីតាំង',
            'នៅឯណា',
            'ម៉ោង',
        )
    )
        return km
            ? ['ម៉ោងបើកទ្វារ?', 'ដឹកជញ្ជូនបានទេ?', 'លេខទូរស័ព្ទ?']
            : [
                  'What are your opening hours?',
                  'Do you deliver?',
                  'Your phone number?',
              ];
    if (
        has(
            'product',
            'price',
            'cheap',
            'buy',
            'bag',
            'new',
            'ផលិតផល',
            'តម្លៃ',
            'ថោក',
            'ទិញ',
            'កាបូប',
            'ថ្មី',
        )
    )
        return km
            ? ['បង្ហាញទំនិញថោកបំផុត', 'ទំនិញថ្មីៗ', 'ជម្រើសដឹកជញ្ជូន?']
            : ['Show the cheapest items', 'New arrivals', 'Delivery options?'];

    return km
        ? ['មានទំនិញអ្វីខ្លះ?', 'ជម្រើសដឹកជញ្ជូន?', 'សាខានៅឯណាខ្លះ?']
        : ['What do you sell?', 'Delivery options', 'Where are your branches?'];
}
