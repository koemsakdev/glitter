import { CustomerEditView } from '@/features/users/components/customer-edit-view';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CustomerEditPage({ params }: PageProps) {
    const { id } = await params;
    return <CustomerEditView id={id} />;
}
