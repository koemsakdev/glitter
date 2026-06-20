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
import { useToast } from "@/hooks/use-toast";

const CONFIG_KEY = ["app-settings", "store-config"] as const;

export default function ThemeSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useStoreConfig();
  const save = useSaveStoreConfig();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StoreTheme | null>(null);
  const [deleting, setDeleting] = useState<StoreTheme | null>(null);

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
            title: "Could not save",
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
            <h2 className="text-lg font-semibold">Theme colors</h2>
            {save.isPending && (
              <span className="flex items-center gap-2 text-md text-muted-foreground mt-0.5">
                <Loader className="size-4 animate-spin" /> Saving
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            The active theme colours the storefront.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
        >
          <Plus className="size-4" />
          Add theme
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {themes.map((t) => {
          const active = t.id === activeThemeId;
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 rounded-xl border bg-card p-3 shadow-2xs ${
                active ? "border-pink-300/75 dark:border-pink-700/75 border-dashed" : ""
              }`}
            >
              <span
                className="size-10 shrink-0 rounded-lg border border-border"
                style={{ backgroundColor: t.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {t.color}
                </p>
              </div>

              {active ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                  <span className="size-1.5 rounded-full bg-pink-500 dark:bg-pink-400" />
                  Active
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => persist(themes, t.id)}
                >
                  Set active
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setEditing(t);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                disabled={themes.length <= 1}
                title={
                  themes.length <= 1 ? "Keep at least one theme" : "Delete"
                }
                onClick={() => setDeleting(t)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <ThemeFormDialog
        key={editing?.id ?? "new"}
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
        title="Delete theme?"
        description={`"${deleting?.name}" will be removed.`}
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={save.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
