export type AddressType = 'shipping' | 'billing' | 'both';

export interface Address {
    id: string;
    userId: string;
    label: string | null;
    recipientName: string;
    recipientPhone: string;
    province: string | null;
    district: string | null;
    commune: string | null;
    village: string | null;
    streetAddress: string;
    postalCode: string | null;
    landmark: string | null;
    addressType: AddressType;
    isDefaultShipping: boolean;
    isDefaultBilling: boolean;
    latitude: string | null;
    longitude: string | null;
    formattedAddress: string;
    createdAt: string;
    updatedAt: string;
}

export interface AddressListResponse {
    data: Address[];
    total: number;
}

export interface AddressFormValues {
    userId: string;
    label?: string;
    recipientName: string;
    recipientPhone: string;
    province?: string;
    district?: string;
    commune?: string;
    village?: string;
    streetAddress: string;
    postalCode?: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
    addressType?: AddressType;
    isDefaultShipping?: boolean;
    isDefaultBilling?: boolean;
}
