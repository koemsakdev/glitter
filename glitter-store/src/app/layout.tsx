import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { getStoreConfig } from '@/lib/api';
import { appearanceVars } from '@/lib/store-config';
import { getLang } from '@/lib/locale';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
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
    const [config, lang] = await Promise.all([getStoreConfig(), getLang()]);

    const rootStyle = {
        ['--brand']: config.themeColor,
        ...appearanceVars(config.appearance),
    } as CSSProperties;

    return (
        <html
            lang={lang}
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
            style={rootStyle}
        >
            <body
                className="flex min-h-full flex-col bg-white text-zinc-900"
                style={{
                    fontFamily: config.appearance.fontFamily || undefined,
                }}
            >
                <SiteHeader config={config} lang={lang} />
                <main className="flex-1">{children}</main>
                <SiteFooter config={config} lang={lang} />
            </body>
        </html>
    );
}
