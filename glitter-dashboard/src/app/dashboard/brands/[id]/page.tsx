import { BrandDetailView } from '@/features/brands/components/brand-detail-view';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function BrandDetailPage({ params }: PageProps) {
    const { id } = await params;
    return <BrandDetailView id={id} />;
}