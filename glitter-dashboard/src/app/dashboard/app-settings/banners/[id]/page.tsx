import { BannerFormView } from '@/features/settings/components/banner-form-view';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditBannerPage({ params }: PageProps) {
    const { id } = await params;
    return <BannerFormView bannerId={id} />;
}
