import { ProductDetailView } from '@/features/products/components/product-detail-view';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
    const { id } = await params;
    return <ProductDetailView id={id} />;
}