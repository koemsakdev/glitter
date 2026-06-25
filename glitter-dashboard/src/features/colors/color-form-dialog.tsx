"use client";

import { Loader2, Plus, Save } from "lucide-react";
import { useState } from "react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BilingualField,
  inputClass,
} from "@/features/settings/components/settings-shared";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import type { Color, ColorFormValues } from "@/types/color";

function normalizeHex(value: string): string {
  let v = value.trim();
  if (v && !v.startsWith("#")) v = `#${v}`;
  return v.toLowerCase();
}

interface ColorFormDialogProps {
  open: boolean;
  item?: Color | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ColorFormValues) => void;
}

export function ColorFormDialog({
  open,
  item,
  pending,
  onOpenChange,
  onSubmit,
}: ColorFormDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const isEdit = Boolean(item);

  const [nameEn, setNameEn] = useState(item?.nameEn ?? "");
  const [nameKm, setNameKm] = useState(item?.nameKm ?? "");
  const [hex, setHex] = useState(item?.hex ?? "#ec4899");

  const validHex = /^#([0-9a-fA-F]{6})$/.test(hex);

  function handleSubmit() {
    if (!nameEn.trim() || !nameKm.trim() || !validHex) {
      toast({ title: t("color.required"), variant: "destructive" });
      return;
    }
    onSubmit({
      nameEn: nameEn.trim(),
      nameKm: nameKm.trim(),
      hex: hex.toLowerCase(),
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
            {isEdit ? t("color.editTitle") : t("color.add")}
          </h2>
        </div>

        <div className="space-y-4 px-6 pb-2">
          <BilingualField
            label={t("color.name")}
            en={nameEn}
            km={nameKm}
            onEn={setNameEn}
            onKm={setNameKm}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("color.hex")}
            </label>
            <div className="flex items-center gap-3">
              <div className="relative size-11 shrink-0 overflow-hidden rounded-md border shadow-sm transition-transform hover:scale-105 active:scale-95">
                <input
                  type="color"
                  value={validHex ? hex : "#000000"}
                  onChange={(e) => setHex(e.target.value)}
                  className="absolute inset-0 size-full cursor-pointer border-none bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:p-0"
                  aria-label={t("color.hex")}
                />
              </div>
              <Input
                value={hex}
                onChange={(e) => setHex(normalizeHex(e.target.value))}
                placeholder="#ec4899"
                className={`${inputClass} font-mono`}
                maxLength={7}
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isEdit ? (
              <Save className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {isEdit ? t("settings.saveChanges") : t("color.add")}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
