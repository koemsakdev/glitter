import { LoginForm } from '@/components/auth/login-form';
import { getLang } from '@/lib/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage() {
    const lang = await getLang();
    return <LoginForm lang={lang} />;
}
