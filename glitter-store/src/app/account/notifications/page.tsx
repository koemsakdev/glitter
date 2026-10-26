import { NotificationsView } from '@/components/account/notifications-view';
import { getLang } from '@/lib/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
    const lang = await getLang();
    return <NotificationsView lang={lang} />;
}
