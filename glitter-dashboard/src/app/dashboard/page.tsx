'use client';

import { Building2, Package, Shapes, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';

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
  const { t } = useI18n();

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('dashboard.welcome')}, {user?.fullName} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">{t('dashboard.overview')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
              label={t('dashboard.totalProducts')}
              value="—"
              icon={Package}
              accent="bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300"
          />
          <StatCard
              label={t('dashboard.totalCategories')}
              value="—"
              icon={Shapes}
              accent="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
          />
          <StatCard
              label={t('dashboard.totalUsers')}
              value="—"
              icon={Users}
              accent="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          />
          <StatCard
              label={t('dashboard.totalBranches')}
              value="—"
              icon={Building2}
              accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
          />
        </div>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-2 text-lg font-semibold">Getting started</h2>
            <p className="text-sm text-muted-foreground">
              Use the sidebar to navigate. In the next chunk we&apos;ll wire up
              real data from your APIs.
            </p>
          </CardContent>
        </Card>
      </div>
  );
}