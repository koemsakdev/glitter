'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useI18n } from '@/lib/i18n';

interface ProductStatusChartProps {
    data: {
        active: number;
        draft: number;
        outOfStock: number;
        archived: number;
        discontinued: number;
    };
}

const COLORS = {
    active: '#ec4899',
    draft: '#94a3b8',
    outOfStock: '#f59e0b',
    discontinued: '#f97316',
    archived: '#71717a',
};

export function ProductStatusChart({ data }: ProductStatusChartProps) {
    const { t } = useI18n();
    const total =
        data.active +
        data.draft +
        data.outOfStock +
        data.archived +
        data.discontinued;

    const chartData = [
        { name: t('product.status.active'), value: data.active, key: 'active' },
        { name: t('product.status.draft'), value: data.draft, key: 'draft' },
        {
            name: t('product.status.outOfStock'),
            value: data.outOfStock,
            key: 'outOfStock',
        },
        {
            name: t('product.status.discontinued'),
            value: data.discontinued,
            key: 'discontinued',
        },
        {
            name: t('product.status.archived'),
            value: data.archived,
            key: 'archived',
        },
    ].filter((d) => d.value > 0);

    return (
        <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">
                    {t('dashboard.statusChart.title')}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                    {t('dashboard.statusChart.subtitle')}
                </p>
            </div>

            {total === 0 ? (
                <div className="flex h-45 items-center justify-center text-sm text-muted-foreground">
                    {t('dashboard.statusChart.empty')}
                </div>
            ) : (
                <div className="grid grid-cols-2 items-center gap-2 p-4">
                    {/* Compact chart */}
                    <div className="relative">
                        <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {chartData.map((entry) => (
                                        <Cell
                                            key={entry.key}
                                            fill={COLORS[entry.key as keyof typeof COLORS]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        fontSize: 11,
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold leading-none">{total}</span>
                            <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('dashboard.statusChart.total')}
              </span>
                        </div>
                    </div>

                    {/* Compact legend with values */}
                    <ul className="space-y-2">
                        {chartData.map((entry) => {
                            const pct = ((entry.value / total) * 100).toFixed(0);
                            return (
                                <li key={entry.key} className="flex items-center gap-2 text-xs">
                  <span
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{
                          backgroundColor:
                              COLORS[entry.key as keyof typeof COLORS],
                      }}
                  />
                                    <span className="min-w-0 flex-1 truncate text-foreground">
                    {entry.name}
                  </span>
                                    <span className="shrink-0 font-mono text-muted-foreground">
                    {entry.value}
                  </span>
                                    <span className="w-7 shrink-0 text-right text-[10px] text-muted-foreground">
                    {pct}%
                  </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}