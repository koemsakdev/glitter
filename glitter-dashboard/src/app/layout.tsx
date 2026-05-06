import React from "react";
import localFont from "next/font/local";
import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/features/auth/auth-provider";
import { QueryProvider } from "@/lib/query-provider";
import { Toaster } from "sonner";
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/lib/theme-provider';

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
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <TooltipProvider>
                <main className="relative flex flex-col min-h-screen">
                  {children}
                </main>
                <Toaster position="top-right" richColors />
              </TooltipProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
