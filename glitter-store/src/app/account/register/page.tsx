import { RegisterForm } from '@/components/auth/register-form';
import { getLang } from '@/lib/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign up' };

export default async function RegisterPage() {
    const lang = await getLang();
    return <RegisterForm lang={lang} />;
}
