import { CheckoutForm } from '@/components/checkout-form';
import { getActiveBranches, getStoreConfig } from '@/lib/api';
import { getLang } from '@/lib/lang';

export const metadata = { title: 'Checkout' };

export default async function CheckoutPage() {
    const [lang, branches, config] = await Promise.all([
        getLang(),
        getActiveBranches(),
        getStoreConfig(),
    ]);
    return (
        <CheckoutForm
            branches={branches}
            lang={lang}
            delivery={config.delivery}
        />
    );
}
