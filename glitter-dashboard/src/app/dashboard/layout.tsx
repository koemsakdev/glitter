'use client';

import {Loader2} from 'lucide-react';
import {SidebarInset, SidebarProvider} from '@/components/ui/sidebar';
import {DashboardSidebar} from '@/components/layout/dashboard-sidebar';
import {DashboardTopbar} from '@/components/layout/dashboard-topbar';
import {ProtectedRoute} from '@/features/auth/components/protected-route';
import {useAuthStore} from '@/stores/auth-store';
import React from "react";

function DashboardShell({children}: { children: React.ReactNode }) {
    const user = useAuthStore((s) => s.user);
    const isHydrated = useAuthStore((s) => s.isHydrated);

    if (!isHydrated || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <DashboardSidebar/>
            <SidebarInset>
                <DashboardTopbar/>
                <main className="flex-1 overflow-auto">
                    <div className="container mx-auto p-4 md:p-6 lg:p-8">
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