import type { Metadata, Viewport } from 'next';
import type { CSSProperties } from 'react';
import localFont from 'next/font/local';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { RouteChrome } from '@/components/route-chrome';
import { MainArea } from '@/components/main-area';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { CartToast } from '@/components/cart-toast';
import { LiveUpdates } from '@/components/live-updates';
import { PageTransition } from '@/components/page-transition';
import { CartProvider } from '@/lib/cart';
import { AuthProvider } from '@/lib/auth';
import { WishlistProvider } from '@/lib/wishlist';
import {
    fileUrl,
    getActivePromotions,
    getBestSellers,
    getMenu,
    getStoreConfig,
} from '@/lib/api';
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
    const logo = fileUrl(config.logoUrl);
    return {
        title: {
            default: `${name} — Beauty & Glitter Shop`,
            template: `%s · ${name}`,
        },
        description: config.taglineEn || 'Beauty & glitter, Phnom Penh.',
        // Use the brand logo (set in the dashboard) as the favicon / app icon.
        // Falls back to the static /favicon.ico when no logo is configured.
        icons: logo
            ? { icon: logo, shortcut: logo, apple: logo }
            : undefined,
    };
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1, // Prevent iOS zoom on inputs just in case
    viewportFit: 'cover',
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [config, lang, menu, promos, popular] = await Promise.all([
        getStoreConfig(),
        getLang(),
        getMenu(),
        getActivePromotions(),
        getBestSellers(20),
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
                {/* Applies the saved/system theme early. `async src` makes it a
                    React-hoistable script (no inline-script dev warning). */}
                <script async src="/theme-init.js" />
                {/* ABA PayWay checkout bridge — defines the global `AbaPayway`
                    used by the checkout page to open ABA's payment modal. */}
                <script
                    async
                    src="https://checkout.payway.com.kh/plugins/checkout2-0.js"
                />
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
                        {/* Hide the store header on mobile checkout so it reads
                            like a native app screen (kept on desktop). */}
                        <RouteChrome
                            hideOn={['/checkout', '/products/*']}
                            mobileOnly
                        >
                            <SiteHeader
                                config={config}
                                lang={lang}
                                menu={headerMenu}
                                promos={promos}
                                popular={popular}
                            />
                        </RouteChrome>
                        <MainArea>
                            <PageTransition>{children}</PageTransition>
                        </MainArea>
                        {/* No footer on mobile checkout — the fixed dock owns the
                            bottom of the screen there. */}
                        <RouteChrome
                            hideOn={['/checkout', '/products/*']}
                            mobileOnly
                        >
                            <SiteFooter
                                config={config}
                                lang={lang}
                                menu={footerMenu}
                            />
                        </RouteChrome>
                        <MobileBottomNav lang={lang} />
                        <CartToast lang={lang} />
                        </CartProvider>
                    </WishlistProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
