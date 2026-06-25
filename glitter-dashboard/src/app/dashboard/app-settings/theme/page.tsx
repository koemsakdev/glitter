"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { ThemeFormDialog } from "@/features/settings/components/theme-form-dialog";
import {
  useSaveStoreConfig,
  useStoreConfig,
} from "@/features/settings/use-settings";
import type { StoreTheme } from "@/features/settings/store-config";
import { getErrorMessage } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

const CONFIG_KEY = ["app-settings", "store-config"] as const;

export default function ThemeSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useStoreConfig();
  const save = useSaveStoreConfig();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StoreTheme | null>(null);
  const [deleting, setDeleting] = useState<StoreTheme | null>(null);
  const [formKey, setFormKey] = useState(0);

  function openForm(theme: StoreTheme | null) {
    setEditing(theme);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  const themes = data?.config.themes ?? [];
  const activeThemeId = data?.config.activeThemeId ?? "";

  function persist(nextThemes: StoreTheme[], nextActiveId = activeThemeId) {
    if (!data) return;
    const active = nextThemes.some((t) => t.id === nextActiveId)
      ? nextActiveId
      : (nextThemes[0]?.id ?? "");
    const themeColor =
      nextThemes.find((t) => t.id === active)?.color ?? data.config.themeColor;
    const nextConfig = {
      ...data.config,
      themes: nextThemes,
      activeThemeId: active,
      themeColor,
    };
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

  function upsert(theme: StoreTheme) {
    const exists = themes.some((t) => t.id === theme.id);
    persist(
      exists
        ? themes.map((t) => (t.id === theme.id ? theme : t))
        : [...themes, theme],
    );
    setFormOpen(false);
    setEditing(null);
  }

  function handleDelete() {
    if (!deleting) return;
    const next = themes.filter((t) => t.id !== deleting.id);
    persist(next, deleting.id === activeThemeId ? next[0]?.id : activeThemeId);
    setDeleting(null);
  }

  if (isLoading) return <LoadingScreen variant="page" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {t("settings.theme.title")}
            </h2>
            {save.isPending && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Loader className="size-4 animate-spin" />
                <span className="mt-0.5">{t("common.saving")}</span>
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("settings.theme.subtitle")}
          </p>
        </div>
        <Button
          onClick={() => openForm(null)}
          className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
        >
          <Plus className="size-4" />
          {t("settings.theme.add")}
        </Button>
      </div>

      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
        {themes.map((theme) => {
          const active = theme.id === activeThemeId;
          return (
            <div
              key={theme.id}
              className={`flex items-center gap-3 rounded-xl border bg-card p-3 shadow-2xs ${
                active ? "border-pink-300/75 dark:border-pink-700/75 border-dashed" : ""
              }`}
            >
              <span
                className="size-10 shrink-0 rounded-lg border border-border"
                style={{ backgroundColor: theme.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{theme.name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {theme.color}
                </p>
              </div>

              {active ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                  <span className="size-1.5 rounded-full bg-pink-500 dark:bg-pink-400" />
                  {t("settings.theme.active")}
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => persist(themes, theme.id)}
                >
                  {t("settings.theme.setActive")}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => openForm(theme)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                disabled={themes.length <= 1}
                title={
                  themes.length <= 1
                    ? t("settings.theme.keepOne")
                    : t("common.delete")
                }
                onClick={() => setDeleting(theme)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <ThemeFormDialog
        key={formKey}
        open={formOpen}
        theme={editing}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        onSave={upsert}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title={t("settings.theme.deleteTitle")}
        description={t("settings.willBeRemoved").replace(
          "{name}",
          deleting?.name ?? "",
        )}
        confirmLabel={t("settings.confirmDelete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        isPending={save.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
