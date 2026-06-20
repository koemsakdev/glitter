'use client';

import { Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inputClass } from '@/features/settings/components/settings-shared';
import { useToast } from '@/hooks/use-toast';
import type { ContactField } from '@/features/settings/store-config';

function newId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
}

interface ContactFieldDialogProps {
    open: boolean;
    field?: ContactField | null;
    onOpenChange: (open: boolean) => void;
    onSave: (field: ContactField) => void;
}

export function ContactFieldDialog({
    open,
    field,
    onOpenChange,
    onSave,
}: ContactFieldDialogProps) {
    const { toast } = useToast();
    const isEdit = Boolean(field);
    const [label, setLabel] = useState(field?.label ?? '');
    const [value, setValue] = useState(field?.value ?? '');

    function handleSave() {
        if (!label.trim() || !value.trim()) {
            toast({
                title: 'Enter a label and value',
                variant: 'destructive',
            });
            return;
        }
        onSave({
            id: field?.id ?? newId(),
            label: label.trim(),
            value: value.trim(),
        });
    }

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-md"
        >
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit ? 'Edit field' : 'Add field'}
                    </h2>
                </div>
                <div className="space-y-4 px-6 pb-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Label</label>
                        <Input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Phone, Email, Map…"
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Value</label>
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="+855…, hello@…, https://maps…"
                            className={inputClass}
                        />
                    </div>
                </div>
                <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {isEdit ? (
                            <Save className="size-4" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        {isEdit ? 'Save changes' : 'Add field'}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
