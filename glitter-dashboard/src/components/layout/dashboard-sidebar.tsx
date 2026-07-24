'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useMemo, useState} from 'react';
import {Search, X} from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import {filterNavigationByRole} from '@/config/navigation';
import {useI18n} from '@/lib/i18n';
import {useAuthStore} from '@/stores/auth-store';

export function DashboardSidebar() {
    const pathname = usePathname();
    const user = useAuthStore((s) => s.user);
    const {t} = useI18n();
    const [query, setQuery] = useState('');

    const allGroups = useMemo(
        () => (user ? filterNavigationByRole(user.role) : []),
        [user],
    );

    // Filter nav items by their (translated) label; drop empty groups.
    const navGroups = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allGroups;
        return allGroups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) =>
                    t(item.labelKey).toLowerCase().includes(q),
                ),
            }))
            .filter((group) => group.items.length > 0);
    }, [allGroups, query, t]);

    if (!user) return null;

    return (
        <Sidebar collapsible="icon" className="border-r">
            <SidebarHeader className="h-16! p-0! border-b border-sidebar-border">
                <SidebarMenu className="h-full">
                    <SidebarMenuItem className="h-full">
                        <Link
                            href="/dashboard"
                            className="flex h-full items-center gap-3 px-3 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                        >
                            <div
                                className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-pink-300/40 dark:ring-pink-400/30">
                                <Image
                                    src="/logo.png"
                                    alt="Glitter Logo"
                                    width={32}
                                    height={32}
                                    className="size-full object-cover"
                                    unoptimized
                                />
                            </div>
                            <div
                                className="flex min-w-0 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="truncate text-base font-semibold tracking-tight">
                  {t('login.title')}
                </span>
                                <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                  Version 1.0.0
                </span>
                            </div>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="gap-0">
                {/* Search — filters the menu; hidden when collapsed to icons */}
                <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('nav.searchMenu')}
                            className="h-9 w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 pl-8 pr-8 text-sm outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-200/40 dark:focus:border-pink-500/40 dark:focus:ring-pink-500/15"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                aria-label="Clear"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </div>
                </div>

                {navGroups.length === 0 && (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                        {t('nav.noResults')}
                    </p>
                )}

                {navGroups.map((group, idx) => (
                    <SidebarGroup key={idx} className="py-2">
                        {group.labelKey && (
                            <SidebarGroupLabel
                                className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                {t(group.labelKey)}
                            </SidebarGroupLabel>
                        )}
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const label = t(item.labelKey);

                                    // ----- Coming-soon item: disabled, with Soon pill -----
                                    if (item.comingSoon) {
                                        return (
                                            <SidebarMenuItem key={item.href}>
                                                <SidebarMenuButton
                                                    tooltip={`${label} · ${t('nav.comingSoon')}`}
                                                    disabled
                                                    aria-disabled="true"
                                                    className="relative h-9 cursor-not-allowed rounded-md opacity-60 hover:bg-transparent! hover:text-current!"
                                                    render={
                                                        <span>
                                                          <Icon className="size-4.5 shrink-0"/>
                                                          <span className="flex-1">{label}</span>
                                                          <span
                                                              className="ml-auto rounded-full bg-pink-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-pink-700 group-data-[collapsible=icon]:hidden dark:bg-pink-500/15 dark:text-pink-300">
                                                            {t('nav.comingSoon')}
                                                          </span>
                                                        </span>
                                                    }
                                                />
                                            </SidebarMenuItem>
                                        );
                                    }

                                    // ----- Normal item -----
                                    // Match the exact route or a sub-route
                                    // (e.g. /customers/[id]), but NOT a sibling
                                    // that merely shares a prefix (a path
                                    // boundary "/" is required, so /staff would
                                    // not match a sibling like /staff-x).
                                    const isActive =
                                        pathname === item.href ||
                                        (item.href !== '/dashboard' &&
                                            pathname.startsWith(item.href + '/'));

                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                isActive={isActive}
                                                tooltip={label}
                                                className="relative h-9 rounded-md transition-colors hover:bg-pink-50! data-active:bg-pink-100! data-active:font-semibold! data-active:text-pink-500! data-active:hover:bg-pink-200/80! dark:hover:bg-pink-500/10! dark:data-active:bg-pink-500/20! dark:data-active:text-pink-400! dark:data-active:hover:bg-pink-500/25!"
                                                render={
                                                    <Link href={item.href}>
                                                        <Icon className="size-4.5 shrink-0"/>
                                                        <span>{label}</span>
                                                    </Link>
                                                }
                                            />
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarRail/>
        </Sidebar>
    );
}