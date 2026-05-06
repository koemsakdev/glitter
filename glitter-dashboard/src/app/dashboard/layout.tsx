'use client';

import React from "react";
import {
    SidebarInset,
    SidebarProvider,
} from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { DashboardTopbar } from '@/components/layout/dashboard-topbar';
import { ProtectedRoute } from '@/features/auth/components/protected-route';

/**
 * Layout for all /dashboard/* routes.
 *
 * Composition:
 *   ProtectedRoute (auth gate)
 *     SidebarProvider (sidebar state)
 *       DashboardSidebar (left nav)
 *       SidebarInset (main content area)
 *         DashboardTopbar (top bar)
 *         {children} (page content)
 */
export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <SidebarProvider>
                <DashboardSidebar />
                <SidebarInset>
                    <DashboardTopbar />
                    <main className="flex-1 overflow-auto">
                        <div className="container mx-auto p-4 md:p-6 lg:p-8">
                            {children}
                        </div>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    );
}