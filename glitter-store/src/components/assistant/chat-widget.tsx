'use client';

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    ChevronRight,
    CreditCard,
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
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const firstName = user?.fullName?.trim().split(' ')[0] ?? '';
    const started = messages.length > 0;

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
                { role: 'model', content: reply.reply, products: reply.products },
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

    // ---- Launcher button (panel closed) -------------------------------------
    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={tr(lang, 'chatOpen')}
                className="group fixed right-4 bottom-24 z-50 flex size-12 items-center justify-center rounded-full bg-white text-(--brand) shadow-lg shadow-zinc-900/15 ring-1 ring-zinc-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 md:right-6 md:bottom-6 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/10"
            >
                {/* soft brand halo on hover */}
                <span className="pointer-events-none absolute inset-0 rounded-full bg-(--brand)/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <RobotIcon className="relative size-7 animate-robot-bob" />
                <span className="absolute -right-0.5 -top-0.5 flex size-3">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                </span>
            </button>
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
            <div className="chat-panel fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col overflow-hidden rounded-t-3xl bg-zinc-50 shadow-2xl md:inset-auto md:top-auto md:right-6 md:bottom-6 md:h-165 md:max-h-[85vh] md:w-96 md:rounded-3xl md:border md:border-zinc-200 dark:bg-zinc-900 md:dark:border-zinc-800">
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
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label={tr(lang, 'chatClose')}
                                className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
                            >
                                <X className="size-5" />
                            </button>
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
                            : 'rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm whitespace-pre-wrap text-zinc-800 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700'
                    }
                >
                    {message.content}
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
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-800 dark:ring-zinc-700">
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
