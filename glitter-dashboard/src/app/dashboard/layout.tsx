'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { DashboardTopbar } from '@/components/layout/dashboard-topbar';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { useAuthStore } from '@/stores/auth-store';
import { usePathname } from 'next/navigation';
import React from "react";

function DashboardShell({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((s) => s.user);
    const isHydrated = useAuthStore((s) => s.isHydrated);
    const pathname = usePathname();

    if (!isHydrated || !user) {
        return <LoadingScreen variant="page" />;
    }

    return (
        <SidebarProvider>
            <DashboardSidebar />
            <SidebarInset className="min-w-0">
                <DashboardTopbar />
                <main className="flex-1">
                    <div
                        key={pathname}
                        className="p-2 duration-300 animate-in fade-in-50 slide-in-from-bottom-2 md:p-4 lg:p-6"
                    >
                        {children}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <DashboardShell>{children}</DashboardShell>
        </ProtectedRoute>
    );
}