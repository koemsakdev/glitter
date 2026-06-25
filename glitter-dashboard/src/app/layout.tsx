import React from "react";
import localFont from "next/font/local";
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/features/auth/auth-provider";
import { QueryProvider } from "@/lib/query-provider";
import { Toaster } from "sonner";
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/lib/theme-provider';
import { RealtimeListener } from '@/lib/realtime-listener';

const googleSans = localFont({
  src: [
    { path: "/fonts/GoogleSans-Regular.ttf", weight: "400" },
    { path: "/fonts/GoogleSans-Medium.ttf", weight: "500" },
    { path: "/fonts/GoogleSans-Bold.ttf", weight: "700" },
  ],
  variable: "--font-google-sans",
});

export const metadata: Metadata = {
  title: 'Glitter Shop Dashboard',
  description: 'Admin dashboard for Glitter Shop',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          googleSans.variable
        )}
      >
         <NuqsAdapter>
          <ThemeProvider>
            <QueryProvider>
              <RealtimeListener />
              <AuthProvider>
                <TooltipProvider>
                  {children}
                  <Toaster position="top-right" richColors />
                </TooltipProvider>
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
         </NuqsAdapter>
      </body>
    </html>
  );
}
