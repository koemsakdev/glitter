'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Sidebar,
    SidebarContent,
    // SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import { filterNavigationByRole } from '@/config/navigation';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';

export function DashboardSidebar() {
    const pathname = usePathname();
    const user = useAuthStore((s) => s.user);
    const { t } = useI18n();

    if (!user) return null;

    const navGroups = filterNavigationByRole(user.role);

    return (
        <Sidebar collapsible="icon" className="border-r">
            <SidebarHeader className="h-16! p-0! border-b border-sidebar-border">
                <SidebarMenu className="h-full">
                    <SidebarMenuItem className="h-full">
                        <Link
                            href="/dashboard"
                            className="flex h-full items-center gap-3 px-3 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                        >
                            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-pink-300/40 dark:ring-pink-400/30">
                                <Image
                                    src="/logo.png"
                                    alt="Glitter Logo"
                                    width={32}
                                    height={32}
                                    className="size-full object-cover"
                                    unoptimized
                                />
                            </div>
                            <div className="flex min-w-0 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
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
                {navGroups.map((group, idx) => (
                    <SidebarGroup key={idx} className="py-2">
                        {group.labelKey && (
                            <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                {t(group.labelKey)}
                            </SidebarGroupLabel>
                        )}
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-0.5">
                                {group.items.map((item) => {
                                    const isActive =
                                        pathname === item.href ||
                                        (item.href !== '/dashboard' &&
                                            pathname.startsWith(item.href));
                                    const Icon = item.icon;

                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                isActive={isActive}
                                                tooltip={t(item.labelKey)}
                                                className="relative h-9 rounded-md transition-colors hover:bg-pink-50! data-active:bg-pink-100! data-active:font-semibold! data-active:text-pink-500! data-active:hover:bg-pink-200/80! dark:hover:bg-pink-500/10! dark:data-active:bg-pink-500/20! dark:data-active:text-pink-400! dark:data-active:hover:bg-pink-500/25!"
                                                render={
                                                    <Link href={item.href}>
                                                        <Icon className="size-4.5 shrink-0" />
                                                        <span>{t(item.labelKey)}</span>
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

            {/*<SidebarFooter className="border-t border-sidebar-border">*/}
            {/*    <div className="px-3 py-2 text-center text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">*/}
            {/*        v1.0 · © 2026*/}
            {/*    </div>*/}
            {/*</SidebarFooter>*/}

            <SidebarRail />
        </Sidebar>
    );
}