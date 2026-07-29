'use client';

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    ChevronRight,
    CreditCard,
    Maximize2,
    Minimize2,
    Package,
    RotateCcw,
    Send,
    Truck,
    X,
} from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';
import { sendChat, type ChatMessage, type ChatProduct } from '@/lib/chat';

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
    lang: initialLang,
    logoUrl,
    brandName,
}: {
    lang: Lang;
    logoUrl?: string | null;
    brandName?: string;
}) {
    const { lang } = useLang(initialLang);
    const { authFetch, user } = useAuth();

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
    const rawFollowUps =
        !loading && lastMsg?.role === 'model'
            ? lastMsg.suggestions && lastMsg.suggestions.length > 0
                ? lastMsg.suggestions
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

    // Restore the transcript so it survives navigation between pages.
    useEffect(() => {
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
        if (messages.length > 0) {
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
    }, [messages, loading]);

    async function send(text: string) {
        const content = text.trim();
        if (!content || loading) return;

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

    // ---- Shared composer ----------------------------------------------------
    const composer = (
        <div className="flex items-end gap-2 border-t border-zinc-100 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-950">
            <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void send(input);
                    }
                }}
                rows={1}
                placeholder={tr(lang, 'chatPlaceholder')}
                className="max-h-28 flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-(--brand) dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <button
                type="button"
                onClick={() => void send(input)}
                disabled={!input.trim() || loading}
                aria-label={tr(lang, 'chatSend')}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--brand) text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
            >
                <Send className="size-5" />
            </button>
        </div>
    );

    // Desktop: floating corner card, or a large centred window when expanded.
    // Mobile is always a full-height sheet (expand has no effect there).
    const panelClass = [
        'chat-panel fixed z-50 flex flex-col overflow-hidden bg-zinc-50 shadow-2xl dark:bg-zinc-900',
        'inset-x-0 bottom-0 top-14 rounded-t-3xl',
        expanded
            ? 'md:inset-0 md:m-auto md:h-[90vh] md:max-h-[880px] md:w-[min(92vw,760px)] md:rounded-3xl md:border md:border-zinc-200 md:dark:border-zinc-800'
            : 'md:inset-auto md:top-auto md:right-6 md:bottom-6 md:h-165 md:max-h-[85vh] md:w-96 md:rounded-3xl md:border md:border-zinc-200 md:dark:border-zinc-800',
    ].join(' ');

    // Desktop-only expand/collapse toggle for the header.
    const expandToggle = (
        <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={tr(lang, expanded ? 'chatCollapse' : 'chatExpand')}
            className="hidden size-8 items-center justify-center rounded-full transition-colors hover:bg-white/15 md:flex"
        >
            {expanded ? (
                <Minimize2 className="size-4.5" />
            ) : (
                <Maximize2 className="size-4.5" />
            )}
        </button>
    );

    // ---- Panel (open) -------------------------------------------------------
    return (
        <>
            {/* Backdrop — dims the page and closes the chat when tapped outside
                (this is what makes "click outside to close" work on desktop). */}
            <button
                type="button"
                aria-label={tr(lang, 'chatClose')}
                onClick={() => setOpen(false)}
                className="chat-backdrop fixed inset-0 z-50 cursor-default bg-zinc-950/40 backdrop-blur-[2px] md:bg-zinc-950/25"
            />
            <div
                className={panelClass}
                style={{
                    transform: dragY ? `translateY(${dragY}px)` : undefined,
                    transition: dragging
                        ? 'none'
                        : 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
                    animation: entered ? 'none' : undefined,
                }}
            >
            {/* Mobile drag handle — swipe down to close (centred so it doesn't
                cover the header buttons). Desktop uses the header controls. */}
            <div
                onPointerDown={onSwipeDown}
                onPointerMove={onSwipeMove}
                onPointerUp={onSwipeEnd}
                onPointerCancel={onSwipeEnd}
                aria-hidden
                className="absolute left-1/2 top-0 z-20 flex h-8 w-24 -translate-x-1/2 touch-none cursor-grab items-center justify-center md:hidden"
            >
                <span className="mt-2 h-1.5 w-10 rounded-full bg-white/60" />
            </div>
            {started ? (
                /* ---- Conversation ---- */
                <>
                    <div className="flex items-center gap-3 bg-linear-to-r from-[color-mix(in_oklab,var(--brand),white_10%)] to-[color-mix(in_oklab,var(--brand),black_16%)] px-4 py-3.5 text-white">
                        <Avatar logoUrl={logoUrl} className="size-9 bg-white/25 ring-1 ring-white/40" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">
                                {brandName || tr(lang, 'chatTitle')}
                            </p>
                            <p className="flex items-center gap-1.5 truncate text-[11px] text-white/85">
                                <span className="inline-block size-1.5 rounded-full bg-emerald-300" />
                                {tr(lang, 'chatSubtitle')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={reset}
                            aria-label={tr(lang, 'chatReset')}
                            className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
                        >
                            <RotateCcw className="size-4.5" />
                        </button>
                        {expandToggle}
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label={tr(lang, 'chatClose')}
                            className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    <div
                        ref={scrollRef}
                        className="flex-1 space-y-3 overflow-y-auto px-3 py-4"
                    >
                        {messages.map((m, i) => (
                            <Bubble
                                key={i}
                                message={m}
                                lang={lang}
                                logoUrl={logoUrl}
                                onNavigate={() => setOpen(false)}
                            />
                        ))}
                        {loading && (
                            <TypingBubble logoUrl={logoUrl} label={tr(lang, 'chatThinking')} />
                        )}
                        {error && (
                            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                {error}
                            </p>
                        )}
                        {/* Contextual quick replies — tap instead of typing. */}
                        {followUps.length > 0 && (
                            <div className="flex flex-wrap gap-2 pl-9 pt-0.5">
                                {followUps.map((q) => (
                                    <button
                                        key={q}
                                        type="button"
                                        onClick={() => void send(q)}
                                        className="rounded-full border border-(--brand)/30 bg-(--brand)/5 px-3 py-1.5 text-xs font-medium text-(--brand) transition-colors hover:bg-(--brand)/15 active:scale-95 dark:border-(--brand)/40 dark:bg-(--brand)/10"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {composer}
                </>
            ) : (
                /* ---- Home screen ---- */
                <>
                    <div className="relative shrink-0 overflow-hidden rounded-b-3xl bg-linear-to-br from-[color-mix(in_oklab,var(--brand),white_18%)] via-(--brand) to-[color-mix(in_oklab,var(--brand),black_18%)] px-5 pb-8 pt-5 text-white">
                        <div className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-white/10 blur-2xl" />
                        <div className="pointer-events-none absolute -left-10 top-12 size-32 rounded-full bg-white/5 blur-2xl" />
                        <div className="relative flex items-center justify-between">
                            <Avatar logoUrl={logoUrl} className="size-11 bg-white/20 ring-1 ring-white/40" />
                            <div className="flex items-center gap-1">
                                {expandToggle}
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label={tr(lang, 'chatClose')}
                                    className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                        </div>
                        <div className="relative mt-8 select-none">
                            <h2 className="text-2xl font-bold leading-tight">
                                {tr(lang, 'chatHello')}
                                {firstName ? ` ${firstName}` : ''} 👋
                            </h2>
                            <p className="mt-1.5 text-lg font-medium text-white/90">
                                {tr(lang, 'chatHelp')}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-4">
                        <p className="select-none px-1 text-sm font-semibold text-zinc-500 dark:text-zinc-300">
                            {tr(lang, 'chatSuggested')}
                        </p>
                        <div className="space-y-2">
                            {SUGGESTIONS.map(({ key, Icon }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => void send(tr(lang, key))}
                                    className="group flex w-full select-none items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-3.5 text-left transition-colors hover:border-(--brand)/40 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-(--brand)/40"
                                >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--brand)/10 text-(--brand) dark:bg-(--brand)/20">
                                        <Icon className="size-4.5" />
                                    </span>
                                    <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                                        {tr(lang, key)}
                                    </span>
                                    <ChevronRight className="size-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-(--brand) dark:text-zinc-500" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {composer}
                </>
            )}
            </div>
        </>
    );
}

// ---- Avatar (logo or fallback glyph) ---------------------------------------

function Avatar({
    logoUrl,
    className = '',
}: {
    logoUrl?: string | null;
    className?: string;
}) {
    return (
        <span
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${
                className || 'size-7 bg-(--brand)/10 ring-1 ring-(--brand)/20'
            }`}
        >
            {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="size-full object-cover" />
            ) : (
                <ChatGlyph className="size-4 text-(--brand)" />
            )}
        </span>
    );
}

// ---- Message bubble ---------------------------------------------------------

function Bubble({
    message,
    lang,
    logoUrl,
    onNavigate,
}: {
    message: ChatMessage;
    lang: Lang;
    logoUrl?: string | null;
    onNavigate?: () => void;
}) {
    const isUser = message.role === 'user';
    return (
        <div
            className={
                isUser ? 'flex justify-end' : 'flex items-end gap-2 justify-start'
            }
        >
            {!isUser && <Avatar logoUrl={logoUrl} />}
            <div className={isUser ? 'max-w-[82%]' : 'max-w-[80%] space-y-2'}>
                <div
                    className={
                        isUser
                            ? 'rounded-2xl rounded-br-md bg-(--brand) px-3.5 py-2.5 text-sm whitespace-pre-wrap text-white'
                            : 'rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm leading-relaxed text-zinc-800 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700'
                    }
                >
                    {isUser ? (
                        message.content
                    ) : (
                        <RichText text={message.content} />
                    )}
                </div>
                {message.products && message.products.length > 0 && (
                    <div className="space-y-2">
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
                className="my-1 list-disc space-y-0.5 pl-4 marker:text-(--brand)"
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
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2 transition-colors hover:border-(--brand)/50 dark:border-zinc-700 dark:bg-zinc-900"
        >
            <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={product.name} className="size-full object-cover" />
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {product.name}
                </span>
                <span className="text-sm font-bold text-(--brand)">
                    ${product.price.toFixed(2)}
                </span>
            </span>
            <span className="shrink-0 rounded-full bg-(--brand)/10 px-2.5 py-1 text-xs font-semibold text-(--brand)">
                {tr(lang, 'chatView')}
            </span>
        </Link>
    );
}

function TypingBubble({
    label,
    logoUrl,
}: {
    label: string;
    logoUrl?: string | null;
}) {
    return (
        <div className="flex items-end gap-2 justify-start">
            <Avatar logoUrl={logoUrl} />
            <div className="flex items-center gap-1 py-2">
                <span className="sr-only">{label}</span>
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
            </div>
        </div>
    );
}

function Dot({ delay }: { delay: string }) {
    return (
        <span
            className="size-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
            style={{ animationDelay: delay }}
        />
    );
}

/**
 * Draggable launcher. Behaves as a normal tap-to-open button, but can be
 * dragged anywhere on screen (position persisted in localStorage). A small
 * movement threshold keeps taps from being read as drags.
 */
function DraggableLauncher({
    onOpen,
    ariaLabel,
}: {
    onOpen: () => void;
    ariaLabel: string;
}) {
    // `pos` is where the button is actually drawn (clamped to the viewport);
    // `anchorRef` is where the user INTENDED it. We always re-clamp from the
    // anchor, so shrinking then growing the window restores the original spot
    // instead of stranding it at the shrunk-in position.
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const anchorRef = useRef<{ x: number; y: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const startRef = useRef({ x: 0, y: 0 });
    const offsetRef = useRef({ x: 0, y: 0 });
    const movedRef = useRef(false);

    useEffect(() => {
        try {
            const s = localStorage.getItem(LAUNCHER_POS_KEY);
            if (s) {
                const saved = JSON.parse(s) as { x: number; y: number };
                anchorRef.current = saved;
                setPos(clamp(saved.x, saved.y));
            }
        } catch {
            /* ignore */
        }
        // On resize/rotate, re-clamp from the intended anchor (not the current
        // clamped value) so the spot is restored when there's room again.
        function onResize() {
            const a = anchorRef.current;
            if (a) setPos(clamp(a.x, a.y));
        }
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function clamp(x: number, y: number) {
        const el = btnRef.current;
        const w = el?.offsetWidth ?? 48;
        const h = el?.offsetHeight ?? 48;
        const m = 8;
        return {
            x: Math.min(Math.max(x, m), window.innerWidth - w - m),
            y: Math.min(Math.max(y, m), window.innerHeight - h - m),
        };
    }

    function onDown(e: React.PointerEvent<HTMLButtonElement>) {
        const el = btnRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        startRef.current = { x: e.clientX, y: e.clientY };
        offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        movedRef.current = false;
        el.setPointerCapture(e.pointerId);
    }
    function onMove(e: React.PointerEvent<HTMLButtonElement>) {
        if (!btnRef.current?.hasPointerCapture(e.pointerId)) return;
        const dx = e.clientX - startRef.current.x;
        const dy = e.clientY - startRef.current.y;
        if (!movedRef.current && Math.hypot(dx, dy) < 6) return; // ignore jitter
        movedRef.current = true;
        setPos(clamp(e.clientX - offsetRef.current.x, e.clientY - offsetRef.current.y));
    }
    function onUp(e: React.PointerEvent<HTMLButtonElement>) {
        try {
            btnRef.current?.releasePointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        if (movedRef.current && pos) {
            // A deliberate move sets a new intended anchor.
            anchorRef.current = pos;
            try {
                localStorage.setItem(LAUNCHER_POS_KEY, JSON.stringify(pos));
            } catch {
                /* ignore */
            }
        }
    }
    function onClick() {
        if (movedRef.current) {
            movedRef.current = false; // it was a drag, not a tap — don't open
            return;
        }
        onOpen();
    }

    const style: React.CSSProperties | undefined = pos
        ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
        : undefined;
    const cornerClass = pos ? '' : 'right-4 bottom-24 md:right-6 md:bottom-6';

    return (
        <button
            ref={btnRef}
            type="button"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onClick={onClick}
            aria-label={ariaLabel}
            style={style}
            className={`group fixed z-50 flex size-12 touch-none cursor-grab items-center justify-center rounded-full bg-white text-(--brand) shadow-lg shadow-zinc-900/15 ring-1 ring-zinc-900/5 transition-shadow hover:shadow-xl active:cursor-grabbing active:scale-95 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/10 ${cornerClass}`}
        >
            <span className="pointer-events-none absolute inset-0 rounded-full bg-(--brand)/10 opacity-0 transition-opacity group-hover:opacity-100" />
            <RobotIcon className="relative size-7 animate-robot-bob" />
            <span className="absolute -right-0.5 -top-0.5 flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
            </span>
        </button>
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

function ChatGlyph({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}

/** A friendly little robot — bobs, blinks, and its antenna light pulses
    (animations defined in globals.css). Two-tone: solid outline/features in
    currentColor over a soft translucent fill of the same colour. */
function RobotIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {/* antenna */}
            <line
                x1="12"
                y1="2"
                x2="12"
                y2="4.4"
                stroke="currentColor"
                strokeWidth="1.7"
            />
            <circle
                className="robot-antenna"
                cx="12"
                cy="1.7"
                r="1.4"
                fill="currentColor"
            />
            {/* rounded head */}
            <rect
                x="3.6"
                y="4.4"
                width="16.8"
                height="14"
                rx="6"
                fill="currentColor"
                fillOpacity="0.14"
            />
            <rect
                x="3.6"
                y="4.4"
                width="16.8"
                height="14"
                rx="6"
                stroke="currentColor"
                strokeWidth="1.7"
            />
            {/* side ears */}
            <path
                d="M2.4 9.6v3.6M21.6 9.6v3.6"
                stroke="currentColor"
                strokeWidth="1.7"
            />
            {/* big friendly eyes (blink) */}
            <g className="robot-eyes" fill="currentColor">
                <circle cx="9" cy="11" r="1.7" />
                <circle cx="15" cy="11" r="1.7" />
            </g>
            {/* curved smile */}
            <path
                d="M9 14.4c.95.95 4.05.95 6 0"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
            />
        </svg>
    );
}
