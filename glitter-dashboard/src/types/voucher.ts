export type DiscountType = 'percent' | 'fixed';
export type DiscountTarget = 'order' | 'delivery';

export interface Voucher {
    id: string;
    /** null = automatic promo (no code needed). */
    code: string | null;
    nameEn: string;
    nameKm: string;
    discountType: DiscountType;
    appliesTo: DiscountTarget;
    discountValue: number;
    minSpend: number;
    maxDiscount: number | null;
    startAt: string | null;
    endAt: string | null;
    usageLimit: number | null;
    usedCount: number;
    firstOrderOnly: boolean;
    newAccountDays: number | null;
    active: boolean;
}

export interface VoucherFormValues {
    code: string | null;
    nameEn: string;
    nameKm: string;
    discountType: DiscountType;
    appliesTo: DiscountTarget;
    discountValue: number;
    minSpend: number;
    maxDiscount: number | null;
    startAt: string | null;
    endAt: string | null;
    usageLimit: number | null;
    firstOrderOnly: boolean;
    newAccountDays: number | null;
    active: boolean;
}
