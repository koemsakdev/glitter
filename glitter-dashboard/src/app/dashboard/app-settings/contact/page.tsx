"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/feedback/loading-screen";
import { ContactFieldDialog } from "@/features/settings/components/contact-field-dialog";
import { SocialLinkDialog } from "@/features/settings/components/social-link-dialog";
import {
  useSaveStoreConfig,
  useStoreConfig,
} from "@/features/settings/use-settings";
import type {
  ContactField,
  SocialLink,
  StoreConfig,
} from "@/features/settings/store-config";
import { getErrorMessage } from "@/lib/api-client";
import { getFileUrl } from "@/lib/file-url";
import { useToast } from "@/hooks/use-toast";

const CONFIG_KEY = ["app-settings", "store-config"] as const;

export default function ContactSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useStoreConfig();
  const save = useSaveStoreConfig();

  const [contactForm, setContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactField | null>(
    null,
  );
  const [socialForm, setSocialForm] = useState(false);
  const [editingSocial, setEditingSocial] = useState<SocialLink | null>(null);
  const [deleting, setDeleting] = useState<{
    type: "contact" | "social";
    id: string;
    label: string;
  } | null>(null);

  const contacts = data?.config.contacts ?? [];
  const socials = data?.config.socials ?? [];

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
            title: "Could not save",
            description: getErrorMessage(error),
            variant: "destructive",
          });
        },
      },
    );
  }

  function upsertContact(f: ContactField) {
    persist({
      contacts: contacts.some((c) => c.id === f.id)
        ? contacts.map((c) => (c.id === f.id ? f : c))
        : [...contacts, f],
    });
    setContactForm(false);
    setEditingContact(null);
  }

  function upsertSocial(s: SocialLink) {
    persist({
      socials: socials.some((x) => x.id === s.id)
        ? socials.map((x) => (x.id === s.id ? s : x))
        : [...socials, s],
    });
    setSocialForm(false);
    setEditingSocial(null);
  }

  function handleDelete() {
    if (!deleting) return;
    if (deleting.type === "contact") {
      persist({ contacts: contacts.filter((c) => c.id !== deleting.id) });
    } else {
      persist({ socials: socials.filter((s) => s.id !== deleting.id) });
    }
    setDeleting(null);
  }

  if (isLoading) return <LoadingScreen variant="page" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Contact & social</h2>
        {save.isPending && (
          <span className="flex items-center gap-2 text-md text-muted-foreground mt-0.5">
            <Loader className="size-4 animate-spin" /> Saving
          </span>
        )}
      </div>

      {/* Contact information */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-base font-semibold">Contact information</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingContact(null);
              setContactForm(true);
            }}
          >
            <Plus className="size-4" />
            Add field
          </Button>
        </div>
        <div className="divide-y">
          {contacts.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              No contact fields yet.
            </p>
          ) : (
            contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 px-6 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.value}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditingContact(c);
                      setContactForm(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      setDeleting({
                        type: "contact",
                        id: c.id,
                        label: c.label,
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Social links */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-base font-semibold">Social links</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingSocial(null);
              setSocialForm(true);
            }}
          >
            <Plus className="size-4" />
            Add link
          </Button>
        </div>
        <div className="divide-y">
          {socials.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              No social links yet.
            </p>
          ) : (
            socials.map((s) => {
              const icon = getFileUrl(s.iconUrl);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-6 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 text-xs font-semibold text-muted-foreground">
                      {icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={icon}
                          alt={s.name}
                          className="size-full object-contain"
                        />
                      ) : (
                        s.name.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {s.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditingSocial(s);
                        setSocialForm(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() =>
                        setDeleting({
                          type: "social",
                          id: s.id,
                          label: s.name,
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ContactFieldDialog
        key={editingContact?.id ?? "new-contact"}
        open={contactForm}
        field={editingContact}
        onOpenChange={(o) => {
          setContactForm(o);
          if (!o) setEditingContact(null);
        }}
        onSave={upsertContact}
      />
      <SocialLinkDialog
        key={editingSocial?.id ?? "new-social"}
        open={socialForm}
        social={editingSocial}
        onOpenChange={(o) => {
          setSocialForm(o);
          if (!o) setEditingSocial(null);
        }}
        onSave={upsertSocial}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title="Delete?"
        description={`"${deleting?.label}" will be removed.`}
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        variant="danger"
        isPending={save.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
