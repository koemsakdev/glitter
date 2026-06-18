import { UserDetailView } from '@/features/users/components/user-detail-view';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function StaffDetailPage({ params }: PageProps) {
    const { id } = await params;
    return (
        <UserDetailView id={id} mode="staff" backHref="/dashboard/staff" />
    );
}
