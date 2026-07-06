'use client';

import { AnimatedMenuIcon } from '@/components/animated-menu-icon';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { UserMenu } from '@/components/layout/user-menu';
import { NotificationBell } from '@/components/layout/notification-bell';
import {BranchSwitcher} from "@/components/layout/branch-switcher";

function CustomSidebarTrigger() {
    const { state, toggleSidebar, isMobile, openMobile } = useSidebar();

    const isOpen = isMobile ? openMobile : state === 'expanded';

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="size-9 rounded-full text-muted-foreground transition-colors bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-500/10 dark:hover:text-pink-300"
            aria-label="Toggle sidebar"
        >
            <AnimatedMenuIcon isOpen={isOpen} />
        </Button>
    );
}

export function DashboardTopbar() {
    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <CustomSidebarTrigger />

            <div className="flex-1" />

            <div className="flex h-6 items-center gap-1">
                <BranchSwitcher />
                <Separator orientation="vertical" />
                <NotificationBell />

                <Separator orientation="vertical" />

                <ThemeToggle />
                <Separator orientation="vertical" />
                <LanguageToggle />

                <Separator orientation="vertical" />

                <UserMenu />
            </div>
        </header>
    );
}