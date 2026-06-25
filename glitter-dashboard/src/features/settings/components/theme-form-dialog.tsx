"use client";

import { Plus, Save } from "lucide-react";
import { useState } from "react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inputClass } from "@/features/settings/components/settings-shared";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import type { StoreTheme } from "@/features/settings/store-config";

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now());
}

interface ThemeFormDialogProps {
  open: boolean;
  theme?: StoreTheme | null;
  onOpenChange: (open: boolean) => void;
  onSave: (theme: StoreTheme) => void;
}

export function ThemeFormDialog({
  open,
  theme,
  onOpenChange,
  onSave,
}: ThemeFormDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isEdit = Boolean(theme);
  const [name, setName] = useState(theme?.name ?? "");
  const [color, setColor] = useState(theme?.color ?? "#ec4899");

  function handleSave() {
    if (!name.trim()) {
      toast({
        title: t("settings.theme.nameRequired"),
        variant: "destructive",
      });
      return;
    }
    onSave({ id: theme?.id ?? newId(), name: name.trim(), color });
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
            {isEdit ? t("settings.theme.editTitle") : t("settings.theme.add")}
          </h2>
        </div>

        <div className="space-y-4 px-6 pb-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              {t("settings.theme.name")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settings.theme.namePlaceholder")}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              {t("settings.theme.color")}
            </label>
            <div className="flex items-center gap-3">
              <div className="relative size-11 shrink-0 overflow-hidden rounded-lg shadow-sm transition-transform">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 size-full cursor-pointer border-none bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:p-0"
                />
              </div>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={`${inputClass} w-32 font-mono`}
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
          >
            {isEdit ? <Save className="size-4" /> : <Plus className="size-4" />}
            {isEdit ? t("settings.saveChanges") : t("settings.theme.add")}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
