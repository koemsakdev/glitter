import { AccountView } from '@/components/auth/account-view';
import { getLang } from '@/lib/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My account' };

export default async function AccountPage() {
    const lang = await getLang();
    return <AccountView lang={lang} />;
}
