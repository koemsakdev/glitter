import { RegisterForm } from '@/components/auth/register-form';
import { fileUrl, getStoreConfig } from '@/lib/api';
import { getLang } from '@/lib/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign up' };

export default async function RegisterPage() {
    const [lang, config] = await Promise.all([getLang(), getStoreConfig()]);
    return (
        <RegisterForm
            lang={lang}
            logoUrl={fileUrl(config.logoUrl)}
            brandName={config.brandNameEn || 'Glitter'}
        />
    );
}
