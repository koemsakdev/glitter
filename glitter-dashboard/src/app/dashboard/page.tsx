'use client';
import {
  Building2,
  Package,
  Shapes,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';
import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

function StatCard({ label, value, icon: Icon, accent }: StatCardProps) {
  return (
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div
              className={`flex size-12 items-center justify-center rounded-lg ${accent}`}
          >
            <Icon className="size-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </CardContent>
      </Card>
  );
}

export default function DashboardHomePage() {
  const user = useAuthStore((s) => s.user);
  const { t, language } = useI18n();
  const khmerClass = language === 'km' ? 'font-khmer' : '';

  return (
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${khmerClass}`}>
            {t('dashboard.welcome')}, {user?.fullName} 👋
          </h1>
          <p className={`mt-1 text-muted-foreground ${khmerClass}`}>
            {t('dashboard.overview')}
          </p>
        </div>

        {/* Stats grid — placeholder values for now (Chunk 4 wires real data) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
              label={t('dashboard.totalProducts')}
              value="—"
              icon={Package}
              accent="bg-primary/10 text-primary"
          />
          <StatCard
              label={t('dashboard.totalCategories')}
              value="—"
              icon={Shapes}
              accent="bg-accent text-accent-foreground"
          />
          <StatCard
              label={t('dashboard.totalUsers')}
              value="—"
              icon={Users}
              accent="bg-secondary text-secondary-foreground"
          />
          <StatCard
              label={t('dashboard.totalBranches')}
              value="—"
              icon={Building2}
              accent="bg-muted text-foreground"
          />
        </div>

        {/* Placeholder content area */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-2 text-lg font-semibold">Getting started</h2>
            <p className="text-sm text-muted-foreground">
              Use the sidebar to navigate. In the next chunk we&apos;ll wire up
              real data from your APIs (products, brands, categories, etc.).
            </p>
          </CardContent>
        </Card>
      </div>
  );
}