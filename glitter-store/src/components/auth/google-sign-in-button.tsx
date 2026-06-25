'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize(config: {
                        client_id: string;
                        callback: (resp: { credential: string }) => void;
                    }): void;
                    renderButton(
                        parent: HTMLElement,
                        options: Record<string, unknown>,
                    ): void;
                };
            };
        };
    }
}

export function GoogleSignInButton() {
    const { loginWithGoogle } = useAuth();
    const router = useRouter();
    const divRef = useRef<HTMLDivElement>(null);
    const handlerRef = useRef<(credential: string) => void>(() => {});

    // Keep the latest handler so the GIS callback always uses fresh closures.
    handlerRef.current = async (credential: string) => {
        try {
            await loginWithGoogle(credential);
            router.push('/account');
        } catch {
            // Surfaced by the page-level form; keep the button silent.
        }
    };

    useEffect(() => {
        if (!CLIENT_ID) return;
        let cancelled = false;

        function init() {
            if (cancelled || !window.google || !divRef.current) return;
            window.google.accounts.id.initialize({
                client_id: CLIENT_ID as string,
                callback: (resp) => handlerRef.current(resp.credential),
            });
            window.google.accounts.id.renderButton(divRef.current, {
                theme: 'outline',
                size: 'large',
                width: 320,
                text: 'continue_with',
                shape: 'pill',
                logo_alignment: 'center',
            });
        }

        if (window.google) {
            init();
            return;
        }
        const id = 'google-gsi-script';
        let script = document.getElementById(id) as HTMLScriptElement | null;
        if (!script) {
            script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.id = id;
            document.body.appendChild(script);
        }
        script.addEventListener('load', init);
        return () => {
            cancelled = true;
            script?.removeEventListener('load', init);
        };
    }, []);

    if (!CLIENT_ID) return null;

    return <div ref={divRef} className="flex justify-center" />;
}
