import { redirect } from 'next/navigation';

// Cart and checkout are now a single merged page. Keep /cart working by
// sending it to the checkout page (which shows the editable cart + confirmation).
export default function CartPage() {
    redirect('/checkout');
}
