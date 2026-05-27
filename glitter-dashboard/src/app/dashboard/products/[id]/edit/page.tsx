import { ProductFormWrapper } from '@/features/products/components/product-form-wrapper';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
    const { id } = await params;
    return <ProductFormWrapper id={id} />;
}