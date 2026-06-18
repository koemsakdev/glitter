'use client';

import { MapPin, Pencil, Phone, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressFormDialog } from '@/features/addresses/components/address-form-dialog';
import {
    useDeleteAddress,
    useSetDefaultShipping,
    useUserAddresses,
} from '@/features/addresses/use-addresses';
import { getErrorMessage } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import type { Address } from '@/types/address';

interface AddressListProps {
    userId: string;
    /** Display only — hide add / edit / delete / set-default actions. */
    readOnly?: boolean;
    /** Pre-fill a new address's recipient with the customer's name/phone. */
    customerName?: string;
    customerPhone?: string;
}

export function AddressList({
    userId,
    readOnly = false,
    customerName,
    customerPhone,
}: AddressListProps) {
    const { t } = useI18n();
    const { toast } = useToast();

    const { data: addresses, isLoading } = useUserAddresses(userId);
    const deleteAddress = useDeleteAddress();
    const setDefaultShipping = useSetDefaultShipping();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Address | null>(null);
    const [deleting, setDeleting] = useState<Address | null>(null);

    async function handleDelete() {
        if (!deleting) return;
        try {
            await deleteAddress.mutateAsync(deleting.id);
            toast({ title: t('address.delete.success'), variant: 'success' });
            setDeleting(null);
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    async function handleSetDefault(address: Address) {
        try {
            await setDefaultShipping.mutateAsync(address.id);
            toast({ title: t('address.default.success'), variant: 'success' });
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                    {t('address.section.title')}
                </h2>
                {!readOnly && (
                    <Button
                        size="sm"
                        onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        <Plus className="mr-2 size-4" />
                        {t('address.action.create')}
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Skeleton className="h-40 rounded-xl" />
                    <Skeleton className="h-40 rounded-xl" />
                </div>
            ) : !addresses || addresses.length === 0 ? (
                <div className="rounded-xl border border-dashed py-12 text-center">
                    <MapPin className="mx-auto size-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t('address.section.empty')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {addresses.map((address) => (
                        <div
                            key={address.id}
                            className="flex flex-col gap-3 rounded-xl border bg-card p-4"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate font-medium">
                                            {address.label ||
                                                address.recipientName}
                                        </span>
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                        <Phone className="size-3" />
                                        {address.recipientPhone}
                                    </div>
                                </div>
                                {!readOnly && (
                                    <div className="flex shrink-0 gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-foreground"
                                            onClick={() => {
                                                setEditing(address);
                                                setFormOpen(true);
                                            }}
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => setDeleting(address)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <p className="text-sm text-muted-foreground">
                                {address.formattedAddress}
                            </p>

                            {address.isDefaultShipping ? (
                                <div className="flex flex-wrap gap-1.5">
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/15">
                                        <Star className="mr-1 size-3" />
                                        {t('address.badge.default')}
                                    </Badge>
                                </div>
                            ) : (
                                !readOnly && (
                                    <div className="mt-auto flex flex-wrap gap-2 pt-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={setDefaultShipping.isPending}
                                            onClick={() =>
                                                void handleSetDefault(address)
                                            }
                                        >
                                            {t('address.action.setDefault')}
                                        </Button>
                                    </div>
                                )
                            )}
                        </div>
                    ))}
                </div>
            )}

            <AddressFormDialog
                open={formOpen}
                userId={userId}
                address={editing}
                defaultRecipientName={customerName}
                defaultRecipientPhone={customerPhone}
                onOpenChange={(o) => {
                    setFormOpen(o);
                    if (!o) setEditing(null);
                }}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => {
                    if (!o) setDeleting(null);
                }}
                title={t('address.delete.title')}
                description={t('address.delete.message')}
                confirmLabel={t('address.delete.confirm')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                isPending={deleteAddress.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
}
