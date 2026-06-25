import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import localFont from 'next/font/local';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { themeInitScript } from '@/components/theme-toggle';
import { LiveUpdates } from '@/components/live-updates';
import { PageTransition } from '@/components/page-transition';
import { CartProvider } from '@/lib/cart';
import { AuthProvider } from '@/lib/auth';
import { WishlistProvider } from '@/lib/wishlist';
import { getMenu, getStoreConfig } from '@/lib/api';
import { appearanceVars, resolveFont } from '@/lib/store-config';
import { getLang } from '@/lib/lang';

const googleSans = localFont({
    src: [
        { path: './fonts/GoogleSans-Regular.ttf', weight: '400' },
        { path: './fonts/GoogleSans-Medium.ttf', weight: '500' },
        { path: './fonts/GoogleSans-Bold.ttf', weight: '700' },
    ],
    variable: '--font-google-sans',
});

export async function generateMetadata(): Promise<Metadata> {
    const config = await getStoreConfig();
    const name = config.brandNameEn || 'Glitter';
    return {
        title: {
            default: `${name} — Beauty & Glitter Shop`,
            template: `%s · ${name}`,
        },
        description: config.taglineEn || 'Beauty & glitter, Phnom Penh.',
    };
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [config, lang, menu] = await Promise.all([
        getStoreConfig(),
        getLang(),
        getMenu(),
    ]);
    const headerMenu = menu.filter((m) => m.location === 'header');
    const footerMenu = menu.filter((m) => m.location === 'footer');

    const rootStyle = {
        ['--brand']: config.themeColor,
        ...appearanceVars(config.appearance),
    } as CSSProperties;

    const font = resolveFont(config.appearance.fontFamily);

    return (
        <html
            lang={lang}
            suppressHydrationWarning
            className={`${googleSans.variable} h-full antialiased`}
            style={rootStyle}
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
                {font.href && (
                    <>
                        <link
                            rel="preconnect"
                            href="https://fonts.googleapis.com"
                        />
                        <link
                            rel="preconnect"
                            href="https://fonts.gstatic.com"
                            crossOrigin="anonymous"
                        />
                        <link rel="stylesheet" href={font.href} />
                    </>
                )}
            </head>
            <body
                className="flex min-h-full flex-col bg-background text-foreground"
                style={{
                    fontFamily: font.stack || undefined,
                }}
            >
                <AuthProvider>
                    <WishlistProvider>
                        <CartProvider>
                        <LiveUpdates />
                        <SiteHeader
                            config={config}
                            lang={lang}
                            menu={headerMenu}
                        />
                        <main className="flex-1 pb-16 sm:pb-0">
                            <PageTransition>{children}</PageTransition>
                        </main>
                        <SiteFooter
                            config={config}
                            lang={lang}
                            menu={footerMenu}
                        />
                        <MobileBottomNav lang={lang} />
                        </CartProvider>
                    </WishlistProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
