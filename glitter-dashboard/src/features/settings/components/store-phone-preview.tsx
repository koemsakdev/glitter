'use client';

import { Loader } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export const STORE_URL = (
    process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3001'
).replace(/\/$/, '');

// The store is drawn at a real phone size, then scaled down to fit.
const PHONE_W = 390;
const PHONE_H = 800;
const SCALE = 0.7;

/**
 * Live preview of the REAL storefront in a phone-sized frame, for settings
 * that change what shoppers see. The store opens once with `query` (preview
 * flags), then every change in `message` is pushed in with postMessage —
 * nothing reloads, nothing is saved by the preview itself.
 */
export function StorePhonePreview({
    title,
    query,
    message,
    toolbar,
    note,
}: {
    title: string;
    /** Query string for the first load, e.g. "aiPreview=chat&aiIcon=bot". */
    query: string;
    /** Sent to the store on load and whenever it changes (needs a `type`). */
    message: { type: string } & Record<string, unknown>;
    toolbar?: ReactNode;
    note?: string;
}) {
    const [loaded, setLoaded] = useState(false);
    const frameRef = useRef<HTMLIFrameElement>(null);
    // Keep the first URL: later changes are messaged in, not reloaded.
    const [src] = useState(() => `${STORE_URL}/?${query}`);
    const payload = JSON.stringify(message);

    useEffect(() => {
        if (!loaded) return;
        frameRef.current?.contentWindow?.postMessage(
            JSON.parse(payload),
            STORE_URL,
        );
    }, [payload, loaded]);

    return (
        <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <h3 className="text-sm font-semibold">{title}</h3>
                {toolbar}
            </div>

            <div className="flex flex-col items-center gap-3 bg-muted/30 px-4 py-5">
                <div className="rounded-lg">
                    <div
                        className="relative overflow-hidden bg-white dark:bg-zinc-950"
                        style={{
                            width: PHONE_W * SCALE,
                            height: PHONE_H * SCALE,
                        }}
                    >
                        {!loaded && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-zinc-950">
                                <Loader className="size-5 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        <iframe
                            ref={frameRef}
                            src={src}
                            title={title}
                            onLoad={() => setLoaded(true)}
                            className="absolute left-0 top-0 block origin-top-left border-0"
                            style={{
                                width: PHONE_W,
                                height: PHONE_H,
                                transform: `scale(${SCALE})`,
                                // The store is another origin, so Chrome draws
                                // it in its own layer and ignores the parent's
                                // rounded clip — round the iframe itself
                                // (pre-scale, so it matches the 3px screen).
                                borderRadius: 3 / SCALE,
                            }}
                        />
                    </div>
                </div>
                {note && (
                    <p className="text-center text-xs text-muted-foreground">
                        {note}
                    </p>
                )}
            </div>
        </div>
    );
}
