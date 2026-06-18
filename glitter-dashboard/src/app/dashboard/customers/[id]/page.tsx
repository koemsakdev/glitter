import { UserDetailView } from '@/features/users/components/user-detail-view';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
    const { id } = await params;
    return (
        <UserDetailView
            id={id}
            mode="customer"
            backHref="/dashboard/customers"
        />
    );
}
