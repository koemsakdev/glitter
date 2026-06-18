'use client';

import { ResponsiveModal } from '@/components/responsive-modal';
import { UserForm } from '@/features/users/components/user-form';
import { useI18n } from '@/lib/i18n';
import type { User } from '@/types/user';

interface UserFormDialogProps {
    open: boolean;
    user?: User | null;
    mode?: 'customer' | 'staff';
    onOpenChange: (open: boolean) => void;
}

export function UserFormDialog({
    open,
    user,
    mode = 'staff',
    onOpenChange,
}: UserFormDialogProps) {
    const { t } = useI18n();
    const isEdit = Boolean(user);

    return (
        <ResponsiveModal open={open} onOpenChange={onOpenChange}>
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit ? t('user.edit.title') : t('user.create.title')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {isEdit ? user?.fullName : t('user.list.subtitle')}
                    </p>
                </div>
                <UserForm
                    key={user?.id ?? 'new'}
                    user={user}
                    mode={mode}
                    onSuccess={() => onOpenChange(false)}
                    onCancel={() => onOpenChange(false)}
                />
            </div>
        </ResponsiveModal>
    );
}
