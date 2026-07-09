'use client';

import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatPrice } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';
import type { SalesGranularity, SalesPoint } from '@/types/dashboard';

const BRAND = '#ec4899';

/** "$1.2k" style compact currency for the y-axis. */
function compact(v: number): string {
    if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return `$${v}`;
}

/** Short x-axis label; monthly buckets show the month only. */
function shortDay(
    iso: string,
    locale: string,
    granularity: SalesGranularity,
): string {
    const d = new Date(`${iso}T00:00:00`);
    const loc = locale === 'km' ? 'km-KH' : 'en-US';
    if (granularity === 'month') {
        return d.toLocaleDateString(loc, { month: 'short' });
    }
    return d.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
}

interface ChartTooltipProps {
    active?: boolean;
    label?: string | number;
    payload?: Array<{ payload: SalesPoint & { label: string } }>;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
        <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
            <p className="font-medium text-foreground">{label}</p>
            <p className="mt-1 font-semibold text-pink-600 dark:text-pink-400">
                {formatPrice(p.revenue)}
            </p>
            <p className="text-muted-foreground">
                {p.orders} {p.orders === 1 ? 'order' : 'orders'}
            </p>
        </div>
    );
}

export function SalesChart({
    data,
    granularity = 'day',
    rangeLabel,
}: {
    data: SalesPoint[];
    granularity?: SalesGranularity;
    rangeLabel?: string;
}) {
    const { t, language } = useI18n();
    const chartData = data.map((d) => ({
        ...d,
        label: shortDay(d.day, language, granularity),
    }));
    const total = data.reduce((s, d) => s + d.revenue, 0);

    return (
        <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold">
                        {t('dashboard.sales.trend')}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                        {t('dashboard.sales.trendSub')}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xl font-bold tabular-nums text-foreground">
                        {formatPrice(total)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                        {rangeLabel ?? t('dashboard.sales.last14')}
                    </p>
                </div>
            </div>

            <div className="mt-4 h-56 text-muted-foreground">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ left: 0, right: 6, top: 8, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="0%"
                                    stopColor={BRAND}
                                    stopOpacity={0.35}
                                />
                                <stop
                                    offset="100%"
                                    stopColor={BRAND}
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: 'currentColor' }}
                            interval="preserveStartEnd"
                            minTickGap={24}
                        />
                        <YAxis
                            width={44}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: 'currentColor' }}
                            tickFormatter={compact}
                            allowDecimals={false}
                        />
                        <Tooltip
                            content={<ChartTooltip />}
                            cursor={{ stroke: BRAND, strokeOpacity: 0.3 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke={BRAND}
                            strokeWidth={2}
                            fill="url(#revFill)"
                            dot={false}
                            activeDot={{ r: 4, fill: BRAND, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
