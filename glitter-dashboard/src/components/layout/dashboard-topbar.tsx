'use client';

import { Bell } from 'lucide-react';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenu } from '@/components/layout/user-menu';

/**
 * Top bar — sits inside SidebarInset, so it only spans the main content area
 * (NOT over the sidebar). Sticky at the top of the scrollable area.
 */
export function DashboardTopbar() {
    return (
        <header className="sticky top-0 z-30 flex h-17 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-5" />

            <div className="flex-1" />

            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-full"
                    aria-label="Notifications"
                >
                    <Bell className="h-4 w-4" />
                </Button>

                <ThemeToggle />
                <LanguageToggle />

                <Separator orientation="vertical" className="mx-1 h-6" />

                <UserMenu />
            </div>
        </header>
    );
}