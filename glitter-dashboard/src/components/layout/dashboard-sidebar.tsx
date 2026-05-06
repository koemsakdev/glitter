'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { filterNavigationByRole } from '@/config/navigation';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';

export function DashboardSidebar() {
    const pathname = usePathname();
    const user = useAuthStore((s) => s.user);
    const { t, language } = useI18n();

    if (!user) return null;

    const navGroups = filterNavigationByRole(user.role);
    const khmerClass = language === 'km' ? 'font-khmer' : '';

    return (
        <Sidebar collapsible="icon" className="border-r">
            {/* Header — logo + brand */}
            <SidebarHeader className="border-b border-sidebar-border p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-sidebar-accent"
                        >
                            <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/70 shadow-md shadow-primary/30 ring-1 ring-primary/20">
                                <Sparkles className="size-4 text-primary-foreground" />
                            </div>
                            <div className="flex min-w-0 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span
                    className={`truncate text-base font-semibold tracking-tight ${khmerClass}`}
                >
                  {t('login.title')}
                </span>
                                <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                  Dashboard
                </span>
                            </div>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* Content — nav groups */}
            <SidebarContent className="gap-0">
                {navGroups.map((group, idx) => (
                    <SidebarGroup key={idx} className="py-2">
                        {group.labelKey && (
                            <SidebarGroupLabel
                                className={`px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 ${khmerClass}`}
                            >
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
                                                className="h-9 rounded-md transition-colors data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary hover:bg-sidebar-accent/50"
                                                render={
                                                    <Link href={item.href}>
                                                        <Icon className="size-4.5 shrink-0" />
                                                        <span className={khmerClass}>
                              {t(item.labelKey)}
                            </span>
                                                    </Link>
                                                }
                                            />
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                        {idx < navGroups.length - 1 && (
                            <SidebarSeparator className="mx-2 mt-2" />
                        )}
                    </SidebarGroup>
                ))}
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter className="border-t border-sidebar-border">
                <div className="px-3 py-2 text-center text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                    v1.0 · © 2026
                </div>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}