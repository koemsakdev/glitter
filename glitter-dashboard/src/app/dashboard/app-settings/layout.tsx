"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useI18n, type TranslationKey } from "@/lib/i18n";

const BASE = "/dashboard/app-settings";

const TABS: { href: string; key: TranslationKey }[] = [
  { href: `${BASE}/general`, key: "settings.tab.general" },
  { href: `${BASE}/theme`, key: "settings.tab.theme" },
  { href: `${BASE}/appearance`, key: "settings.tab.appearance" },
  { href: `${BASE}/contact`, key: "settings.tab.contact" },
  { href: `${BASE}/home`, key: "settings.tab.home" },
  { href: `${BASE}/banners`, key: "settings.tab.banners" },
  { href: `${BASE}/sections`, key: "settings.tab.sections" },
  { href: `${BASE}/menu`, key: "settings.tab.menu" },
  { href: `${BASE}/pages`, key: "settings.tab.pages" },
];

export default function AppSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  // Deeper pages (e.g. the banner add/edit form) render standalone — no tabs.
  const isTab = TABS.some((tab) => tab.href === pathname);
  if (!isTab) return <>{children}</>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("nav.appSettings")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="-mb-px flex gap-1 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-pink-500 text-pink-600 dark:text-pink-300"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(tab.key)}
            </Link>
          );
        })}
      </div>

      <div className="mt-4">{children}</div>
    </div>
  );
}
