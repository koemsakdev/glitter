import { LoginForm } from '@/components/auth/login-form';
import { fileUrl, getStoreConfig } from '@/lib/api';
import { getLang } from '@/lib/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage() {
    const [lang, config] = await Promise.all([getLang(), getStoreConfig()]);
    return (
        <LoginForm
            lang={lang}
            logoUrl={fileUrl(config.logoUrl)}
            brandName={config.brandNameEn || 'Glitter'}
        />
    );
}
