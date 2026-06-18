import { redirect } from 'next/navigation';

export default function AppSettingsIndex() {
    redirect('/dashboard/app-settings/general');
}
