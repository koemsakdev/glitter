"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ImageOff, Loader, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { BilingualField } from "@/features/settings/components/settings-shared";
import { LogoFormDialog } from "@/features/settings/components/logo-form-dialog";
import { DeliveryConfigCard } from "@/features/settings/components/delivery-config-card";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import {
  useSaveStoreConfig,
  useStoreConfig,
} from "@/features/settings/use-settings";
import type { StoreConfig, StoreLogo } from "@/features/settings/store-config";
import { getErrorMessage } from "@/lib/api-client";
import { getFileUrl } from "@/lib/file-url";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

const CONFIG_KEY = ["app-settings", "store-config"] as const;

type StringKey = {
  [K in keyof StoreConfig]: StoreConfig[K] extends string ? K : never;
}[keyof StoreConfig];

interface IdentityField {
  titleKey: TranslationKey;
  noteKey: TranslationKey;
  enKey: StringKey;
  kmKey: StringKey;
  multiline: boolean;
}

const FIELDS: IdentityField[] = [
  {
    titleKey: "settings.general.shopName",
    noteKey: "settings.general.brandingNote",
    enKey: "brandNameEn",
    kmKey: "brandNameKm",
    multiline: false,
  },
  {
    titleKey: "settings.general.tagline",
    noteKey: "settings.general.taglineNote",
    enKey: "taglineEn",
    kmKey: "taglineKm",
    multiline: false,
  },
  {
    titleKey: "settings.general.footerDesc",
    noteKey: "settings.general.footerNote",
    enKey: "footerDescriptionEn",
    kmKey: "footerDescriptionKm",
    multiline: true,
  },
];

const CHECKER = {
  backgroundImage:
    "linear-gradient(45deg,rgba(120,120,120,0.10) 25%,transparent 25%,transparent 75%,rgba(120,120,120,0.10) 75%),linear-gradient(45deg,rgba(120,120,120,0.10) 25%,transparent 25%,transparent 75%,rgba(120,120,120,0.10) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,8px 8px",
};

export default function GeneralSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useStoreConfig();
  const save = useSaveStoreConfig();

  const [editing, setEditing] = useState<IdentityField | null>(null);
  const [logoFormOpen, setLogoFormOpen] = useState(false);
  const [editingLogo, setEditingLogo] = useState<StoreLogo | null>(null);
  const [deletingLogo, setDeletingLogo] = useState<StoreLogo | null>(null);
  const [logoFormKey, setLogoFormKey] = useState(0);

  function openLogoForm(logo: StoreLogo | null) {
    setEditingLogo(logo);
    setLogoFormKey((k) => k + 1);
    setLogoFormOpen(true);
  }

  const config = data?.config;

  function persist(patch: Partial<StoreConfig>) {
    if (!data) return;
    const nextConfig = { ...data.config, ...patch };
    queryClient.setQueryData(CONFIG_KEY, { ...data, config: nextConfig });
    save.mutate(
      { config: nextConfig, settingId: data.settingId },
      {
        onError: (error) => {
          void queryClient.invalidateQueries({
            queryKey: ["app-settings"],
          });
          toast({
            title: t("settings.couldNotSave"),
            description: getErrorMessage(error),
            variant: "destructive",
          });
        },
      },
    );
  }

  function persistLogos(nextLogos: StoreLogo[], nextActiveId?: string) {
    if (!config) return;
    const wanted = nextActiveId ?? config.activeLogoId;
    const active = nextLogos.some((l) => l.id === wanted)
      ? wanted
      : (nextLogos[0]?.id ?? "");
    const logoUrl = nextLogos.find((l) => l.id === active)?.url ?? "";
    persist({ logos: nextLogos, activeLogoId: active, logoUrl });
  }

  if (isLoading || !config) return <LoadingScreen variant="page" />;

  const logos = config.logos;

  function upsertLogo(logo: StoreLogo) {
    persistLogos(
      logos.some((l) => l.id === logo.id)
        ? logos.map((l) => (l.id === logo.id ? logo : l))
        : [...logos, logo],
    );
    setLogoFormOpen(false);
    setEditingLogo(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{t("settings.general.title")}</h2>
        {save.isPending && (
          <span className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <Loader className="size-4 animate-spin" />
            <span className="mt-0.5">{t("common.saving")}</span>
          </span>
        )}
      </div>

      {/* Logo list */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              {t("settings.general.logo")}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("settings.general.logoNote")}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => openLogoForm(null)}
          >
            <Plus className="size-4" />
            {t("settings.general.addLogo")}
          </Button>
        </div>

        {logos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <ImageOff className="size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("settings.general.noLogos")}
            </p>
          </div>
        ) : (
          <div className="stagger grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {logos.map((logo) => {
              const active = logo.id === config.activeLogoId;
              const src = getFileUrl(logo.url);
              return (
                <div key={logo.id} className="group space-y-1.5">
                  <div
                    onClick={() => {
                      if (!active) persistLogos(logos, logo.id);
                    }}
                    title={active ? undefined : t("settings.theme.setActive")}
                    className={`relative aspect-square cursor-pointer overflow-hidden rounded-xl border transition-all ${
                      active
                        ? "border-pink-400 ring-2 ring-pink-300 dark:border-pink-600 dark:ring-pink-700"
                        : "border-border hover:border-pink-300 dark:hover:border-pink-700"
                    }`}
                    style={CHECKER}
                  >
                    {src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={logo.name}
                        className="size-full object-contain"
                      />
                    )}

                    {active && (
                      <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-pink-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                        <span className="size-1.5 rounded-full bg-white" />
                        {t("settings.theme.active")}
                      </span>
                    )}

                    <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        title={t("common.edit")}
                        onClick={(e) => {
                          e.stopPropagation();
                          openLogoForm(logo);
                        }}
                        className="flex size-7 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow transition-colors hover:text-foreground dark:bg-zinc-800/90 dark:text-zinc-100"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title={t("common.delete")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingLogo(logo);
                        }}
                        className="flex size-7 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow transition-colors hover:text-destructive dark:bg-zinc-800/90 dark:text-zinc-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="truncate text-center text-xs font-medium">
                    {logo.name}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Identity text fields */}
      <div className="space-y-3">
        {FIELDS.map((field) => {
          const en = config[field.enKey];
          const km = config[field.kmKey];
          return (
            <div
              key={field.enKey}
              className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t(field.titleKey)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(field.noteKey)}
                </p>
                <p
                  className={`mt-2 text-sm ${
                    en || km
                      ? "text-foreground"
                      : "italic text-muted-foreground"
                  }`}
                >
                  {en || km || t("settings.general.notSet")}
                </p>
                {en && km && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{km}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setEditing(field)}
              >
                <Pencil className="size-4" />
                {t("common.edit")}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Delivery, regions & payment options (ABA credentials are configured
          inside each ABA-based payment option). */}
      <DeliveryConfigCard
        value={config.delivery}
        saving={save.isPending}
        onChange={(delivery) => persist({ delivery })}
      />

      {editing && (
        <EditDialog
          key={editing.enKey}
          field={editing}
          initialEn={config[editing.enKey]}
          initialKm={config[editing.kmKey]}
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
          onSave={(en, km) => {
            persist({
              [editing.enKey]: en,
              [editing.kmKey]: km,
            } as Partial<StoreConfig>);
            setEditing(null);
          }}
        />
      )}

      <LogoFormDialog
        key={logoFormKey}
        open={logoFormOpen}
        logo={editingLogo}
        onOpenChange={(o) => {
          setLogoFormOpen(o);
          if (!o) setEditingLogo(null);
        }}
        onSave={upsertLogo}
      />

      <ConfirmDialog
        open={deletingLogo !== null}
        onOpenChange={(o) => {
          if (!o) setDeletingLogo(null);
        }}
        title={t("settings.general.deleteLogoTitle")}
        description={t("settings.willBeRemoved").replace(
          "{name}",
          deletingLogo?.name ?? "",
        )}
        confirmLabel={t("settings.confirmDelete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        isPending={save.isPending}
        onConfirm={() => {
          if (deletingLogo)
            persistLogos(logos.filter((l) => l.id !== deletingLogo.id));
          setDeletingLogo(null);
        }}
      />
    </div>
  );
}

function EditDialog({
  field,
  initialEn,
  initialKm,
  onOpenChange,
  onSave,
}: {
  field: IdentityField;
  initialEn: string;
  initialKm: string;
  onOpenChange: (open: boolean) => void;
  onSave: (en: string, km: string) => void;
}) {
  const { t } = useI18n();
  const [en, setEn] = useState(initialEn);
  const [km, setKm] = useState(initialKm);

  return (
    <ResponsiveModal open onOpenChange={onOpenChange} className="sm:max-w-lg">
      <div className="flex flex-col">
        <div className="px-6 pb-4 pt-6">
          <h2 className="text-xl font-bold tracking-tight">
            {t(field.titleKey)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(field.noteKey)}
          </p>
        </div>
        <div className="px-6 pb-2">
          <BilingualField
            label={t(field.titleKey)}
            en={en}
            km={km}
            onEn={setEn}
            onKm={setKm}
            textarea={field.multiline}
          />
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
            onClick={() => onSave(en.trim(), km.trim())}
            className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
          >
            {t("settings.saveChanges")}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
