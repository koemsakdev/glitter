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
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-xl"
        >
            <div className="flex flex-col">
                {/* Screen-reader title; the form shows a live preview header. */}
                <h2 className="sr-only">
                    {isEdit ? t('user.edit.title') : t('user.create.title')}
                </h2>
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
