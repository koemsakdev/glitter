'use client';

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Label,
    LabelList,
    Pie,
    PieChart,
    PolarGrid,
    PolarRadiusAxis,
    RadialBar,
    RadialBarChart,
    XAxis,
    YAxis,
} from 'recharts';
import {
    CalendarRange,
    Download,
    ImageIcon,
    Inbox,
    Loader,
    Package,
    Percent,
    TicketPercent,
    TrendingDown,
    TrendingUp,
    Truck,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { SafeImage as Image } from '@/components/ui/safe-image';
import {
    DateRangeFilter,
    RANGE_PRESETS,
    type DateRange,
} from '@/features/dashboard/components/date-range-filter';
import {
    DELIVERY_LABEL,
    PAY_LABEL,
    STATUS_LABEL,
    toCsv,
} from '@/features/reports/orders-csv';
import {
    fetchOrderExport,
    useSalesReport,
    type SalesReport,
} from '@/features/reports/reports-api';
import { getFileUrl } from '@/lib/file-url';
import { formatPrice } from '@/lib/formatters';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSelectedBranchId } from '@/stores/use-branch-context';

type T = (k: TranslationKey) => string;

/** Brand palette for categorical charts (pink first). */
const PALETTE = [
    '#ec4899',
    '#8b5cf6',
    '#0ea5e9',
    '#f59e0b',
    '#10b981',
    '#f43f5e',
    '#64748b',
];

const STATUS_COLOR: Record<string, string> = {
    completed: '#10b981',
    paid: '#14b8a6',
    processing: '#0ea5e9',
    shipped: '#6366f1',
    pending: '#f59e0b',
    awaiting_payment: '#fb923c',
    cancelled: '#f43f5e',
    expired: '#a1a1aa',
    refunded: '#a855f7',
};

/* ───────────────────────── helpers ───────────────────────── */

/** % change vs the previous period; null when there's nothing to compare. */
function change(now: number, before: number): number | null {
    if (!before) return null;
    return ((now - before) / before) * 100;
}

function compactMoney(v: number): string {
    if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return `$${Math.round(v)}`;
}

function fmtDate(
    iso: string,
    locale: string,
    opts: Intl.DateTimeFormatOptions,
): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(
        locale === 'km' ? 'km-KH' : 'en-GB',
        opts,
    );
}

function label(map: Record<string, TranslationKey>, key: string, t: T): string {
    return map[key]
        ? t(map[key])
        : key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

/** Chart config keys become CSS variables — keep them safe. */
const slug = (k: string) => k.replace(/[^a-zA-Z0-9_-]/g, '-') || 'other';

/** Tooltip row with a coloured dot and a money value. */
function moneyRow(
    color: string | undefined,
    name: ReactNode,
    value: number,
    extra?: string,
) {
    return (
        <div className="flex w-full items-center gap-2">
            <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ background: color }}
            />
            <span className="flex-1 text-muted-foreground">{name}</span>
            <span className="font-mono font-medium tabular-nums text-foreground">
                {formatPrice(value)}
                {extra && (
                    <span className="ml-1.5 text-muted-foreground">
                        {extra}
                    </span>
                )}
            </span>
        </div>
    );
}

function TrendBadge({ value }: { value: number | null }) {
    if (value == null) return null;
    const up = value >= 0;
    const Icon = up ? TrendingUp : TrendingDown;
    return (
        <Badge
            variant="outline"
            className={cn(
                'gap-1 rounded-full',
                up
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400',
            )}
        >
            <Icon className="size-3" />
            {up ? '+' : ''}
            {value.toFixed(1)}%
        </Badge>
    );
}

function EmptyChart({ text }: { text: string }) {
    return (
        <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Inbox className="size-6 opacity-40" />
            {text}
        </div>
    );
}

/* ───────────────────────── KPI cards ───────────────────────── */

function KpiCard({
    title,
    value,
    trend,
    footer,
    sub,
}: {
    title: string;
    value: string;
    trend: number | null;
    footer: string;
    sub: string;
}) {
    const up = (trend ?? 0) >= 0;
    return (
        <Card className="@container/card bg-linear-to-t from-pink-500/5 to-card shadow-xs dark:bg-card">
            <CardHeader>
                <CardDescription>{title}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {value}
                </CardTitle>
                <CardAction>
                    <TrendBadge value={trend} />
                </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
                <div className="line-clamp-1 flex items-center gap-1.5 font-medium">
                    {footer}
                    {trend != null &&
                        (up ? (
                            <TrendingUp className="size-4 text-emerald-500" />
                        ) : (
                            <TrendingDown className="size-4 text-rose-500" />
                        ))}
                </div>
                <div className="text-muted-foreground">{sub}</div>
            </CardFooter>
        </Card>
    );
}

/* ───────────────────────── Revenue (interactive area) ───────────────────────── */

function RevenueChart({ r }: { r: SalesReport }) {
    const { t, language } = useI18n();
    const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
    const monthly = r.range.granularity === 'month';
    const config = {
        revenue: { label: t('reports.revenue'), color: '#ec4899' },
        orders: { label: t('reports.sales'), color: '#8b5cf6' },
    } satisfies ChartConfig;
    const totals = {
        revenue: r.summary.revenue,
        orders: r.summary.orders,
    };
    const fmtTick = (d: string) =>
        fmtDate(
            d,
            language,
            monthly
                ? { month: 'short', year: '2-digit' }
                : { day: 'numeric', month: 'short' },
        );

    return (
        <Card className="gap-0 py-0">
            <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 pt-4 sm:py-5">
                    <CardTitle>
                        {t(
                            monthly
                                ? 'reports.chart.monthly'
                                : 'reports.chart.daily',
                        )}
                    </CardTitle>
                    <CardDescription>{t('reports.chart.desc')}</CardDescription>
                </div>
                <div className="flex">
                    {(['revenue', 'orders'] as const).map((key) => (
                        <button
                            key={key}
                            type="button"
                            data-active={metric === key}
                            onClick={() => setMetric(key)}
                            className="relative z-10 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left transition-colors even:border-l hover:bg-muted/40 data-[active=true]:bg-muted/60 sm:border-l sm:border-t-0 sm:px-8 sm:py-5"
                        >
                            <span className="text-xs text-muted-foreground">
                                {config[key].label}
                            </span>
                            <span className="text-lg font-bold leading-none tabular-nums sm:text-3xl">
                                {key === 'revenue'
                                    ? formatPrice(totals.revenue)
                                    : totals.orders.toLocaleString()}
                            </span>
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer
                    config={config}
                    className="aspect-auto h-72 w-full"
                >
                    <AreaChart data={r.byDay} margin={{ left: 4, right: 12 }}>
                        <defs>
                            {(['revenue', 'orders'] as const).map((k) => (
                                <linearGradient
                                    key={k}
                                    id={`fill-${k}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor={`var(--color-${k})`}
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={`var(--color-${k})`}
                                        stopOpacity={0.05}
                                    />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={fmtTick}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            width={44}
                            allowDecimals={false}
                            tickFormatter={(v: number) =>
                                metric === 'revenue'
                                    ? compactMoney(v)
                                    : String(v)
                            }
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    labelFormatter={(_, payload) => {
                                        const day = payload?.[0]?.payload
                                            ?.day as string | undefined;
                                        return day
                                            ? fmtDate(
                                                  day,
                                                  language,
                                                  monthly
                                                      ? {
                                                            month: 'long',
                                                            year: 'numeric',
                                                        }
                                                      : {
                                                            weekday: 'short',
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        },
                                              )
                                            : '';
                                    }}
                                    formatter={(value, _name, item) =>
                                        metric === 'revenue' ? (
                                            moneyRow(
                                                item.color,
                                                config.revenue.label,
                                                Number(value),
                                            )
                                        ) : (
                                            <div className="flex w-full items-center gap-2">
                                                <span
                                                    className="size-2.5 shrink-0 rounded-[2px]"
                                                    style={{
                                                        background: item.color,
                                                    }}
                                                />
                                                <span className="flex-1 text-muted-foreground">
                                                    {config.orders.label}
                                                </span>
                                                <span className="font-mono font-medium tabular-nums">
                                                    {String(value)}
                                                </span>
                                            </div>
                                        )
                                    }
                                />
                            }
                        />
                        <Area
                            dataKey={metric}
                            type="natural"
                            fill={`url(#fill-${metric})`}
                            stroke={`var(--color-${metric})`}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

/* ───────────────────────── Completion (radial) ───────────────────────── */

function CompletionChart({ r }: { r: SalesReport }) {
    const { t } = useI18n();
    const s = r.summary;
    const rate = s.allOrders ? (s.orders / s.allOrders) * 100 : 0;
    const config = {
        rate: { label: t('reports.completion'), color: '#ec4899' },
    } satisfies ChartConfig;
    const data = [{ name: 'rate', rate, fill: 'var(--color-rate)' }];
    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0 text-center">
                <CardTitle>{t('reports.completion')}</CardTitle>
                <CardDescription>{t('reports.completionDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={config}
                    className="mx-auto aspect-square max-h-56"
                >
                    <RadialBarChart
                        data={data}
                        startAngle={90}
                        endAngle={90 - (360 * rate) / 100}
                        innerRadius={80}
                        outerRadius={110}
                    >
                        <PolarGrid
                            gridType="circle"
                            radialLines={false}
                            stroke="none"
                            className="first:fill-muted last:fill-background"
                            polarRadius={[86, 74]}
                        />
                        <RadialBar
                            dataKey="rate"
                            background
                            cornerRadius={10}
                        />
                        <PolarRadiusAxis
                            tick={false}
                            tickLine={false}
                            axisLine={false}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (
                                        viewBox &&
                                        'cx' in viewBox &&
                                        'cy' in viewBox
                                    ) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-4xl font-bold"
                                                >
                                                    {rate.toFixed(0)}%
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy ?? 0) + 24}
                                                    className="fill-muted-foreground text-xs"
                                                >
                                                    {s.orders} / {s.allOrders}
                                                </tspan>
                                            </text>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </PolarRadiusAxis>
                    </RadialBarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-1.5 text-sm">
                <div className="flex items-center gap-2 font-medium leading-none">
                    {t('reports.cancelRateSub').replace(
                        '{count}',
                        String(s.cancelled),
                    )}{' '}
                    {t('reports.cancelledOrExpired')}
                </div>
                <div className="leading-none text-muted-foreground">
                    {t('reports.completionFoot')}
                </div>
            </CardFooter>
        </Card>
    );
}

/* ───────────────────────── Donuts ───────────────────────── */

function DonutCard({
    title,
    description,
    centerValue,
    centerLabel,
    rows,
    money,
    footer,
}: {
    title: string;
    description: string;
    centerValue: string;
    centerLabel: string;
    rows: {
        key: string;
        label: string;
        value: number;
        color: string;
        extra?: string;
    }[];
    /** Values are money (otherwise counts). */
    money?: boolean;
    footer?: ReactNode;
}) {
    const { t } = useI18n();
    const config = useMemo(
        () =>
            Object.fromEntries(
                rows.map((r) => [
                    slug(r.key),
                    { label: r.label, color: r.color },
                ]),
            ) satisfies ChartConfig,
        [rows],
    );
    const data = rows.map((r) => ({
        key: slug(r.key),
        value: r.value,
        extra: r.extra,
        fill: `var(--color-${slug(r.key)})`,
    }));
    const total = rows.reduce((n, r) => n + r.value, 0) || 1;

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                {rows.length === 0 ? (
                    <EmptyChart text={t('reports.noData')} />
                ) : (
                    <ChartContainer
                        config={config}
                        className="mx-auto aspect-square max-h-64"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        hideLabel
                                        nameKey="key"
                                        formatter={(value, _n, item) => {
                                            const p = item.payload as {
                                                key: string;
                                                extra?: string;
                                                fill: string;
                                            };
                                            const pct = `${((Number(value) / total) * 100).toFixed(0)}%`;
                                            return money ? (
                                                moneyRow(
                                                    config[p.key]?.color,
                                                    config[p.key]?.label,
                                                    Number(value),
                                                    p.extra,
                                                )
                                            ) : (
                                                <div className="flex w-full items-center gap-2">
                                                    <span
                                                        className="size-2.5 shrink-0 rounded-[2px]"
                                                        style={{
                                                            background:
                                                                config[p.key]
                                                                    ?.color,
                                                        }}
                                                    />
                                                    <span className="flex-1 text-muted-foreground">
                                                        {config[p.key]?.label}
                                                    </span>
                                                    <span className="font-mono font-medium tabular-nums">
                                                        {String(value)}
                                                        <span className="ml-1.5 text-muted-foreground">
                                                            {pct}
                                                        </span>
                                                    </span>
                                                </div>
                                            );
                                        }}
                                    />
                                }
                            />
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="key"
                                innerRadius={62}
                                outerRadius={92}
                                paddingAngle={rows.length > 1 ? 2 : 0}
                                cornerRadius={4}
                                strokeWidth={2}
                            >
                                {data.map((d) => (
                                    <Cell
                                        key={d.key}
                                        fill={d.fill}
                                        className="stroke-background"
                                    />
                                ))}
                                <Label
                                    content={({ viewBox }) => {
                                        if (
                                            viewBox &&
                                            'cx' in viewBox &&
                                            'cy' in viewBox
                                        ) {
                                            return (
                                                <text
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        className="fill-foreground text-2xl font-bold"
                                                    >
                                                        {centerValue}
                                                    </tspan>
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={
                                                            (viewBox.cy ?? 0) +
                                                            22
                                                        }
                                                        className="fill-muted-foreground text-xs"
                                                    >
                                                        {centerLabel}
                                                    </tspan>
                                                </text>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </Pie>
                            <ChartLegend
                                content={<ChartLegendContent nameKey="key" />}
                                className="-translate-y-1 flex-wrap gap-x-3 gap-y-1.5 *:basis-auto *:justify-center"
                            />
                        </PieChart>
                    </ChartContainer>
                )}
            </CardContent>
            {footer && (
                <CardFooter className="text-sm text-muted-foreground">
                    {footer}
                </CardFooter>
            )}
        </Card>
    );
}

/* ───────────────────────── Bars ───────────────────────── */

function HoursChart({ r }: { r: SalesReport }) {
    const { t } = useI18n();
    const config = {
        orders: { label: t('reports.sales'), color: '#ec4899' },
    } satisfies ChartConfig;
    const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
    const peak = r.byHour.reduce<SalesReport['byHour'][number] | null>(
        (b, h) => (h.orders > (b?.orders ?? 0) ? h : b),
        null,
    );
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('reports.byHour')}</CardTitle>
                <CardDescription>{t('reports.byHourDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                {!peak ? (
                    <EmptyChart text={t('reports.noData')} />
                ) : (
                    <ChartContainer
                        config={config}
                        className="aspect-auto h-52 w-full"
                    >
                        <BarChart data={r.byHour} margin={{ top: 16 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="hour"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                interval={0}
                                tickFormatter={(h: number) =>
                                    h % 3 === 0
                                        ? String(h).padStart(2, '0')
                                        : ''
                                }
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(_, p) => {
                                            const h = Number(
                                                p?.[0]?.payload?.hour ?? 0,
                                            );
                                            return `${hh(h)} – ${hh((h + 1) % 24)}`;
                                        }}
                                    />
                                }
                            />
                            <Bar dataKey="orders" radius={6}>
                                {r.byHour.map((h) => (
                                    <Cell
                                        key={h.hour}
                                        fill="var(--color-orders)"
                                        fillOpacity={
                                            h.hour === peak.hour ? 1 : 0.35
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
            {peak && (
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="flex gap-2 font-medium leading-none">
                        {t('reports.peak')} {hh(peak.hour)} –{' '}
                        {hh((peak.hour + 1) % 24)}
                        <TrendingUp className="size-4 text-pink-500" />
                    </div>
                    <div className="leading-none text-muted-foreground">
                        {t('reports.peakSub').replace(
                            '{count}',
                            String(peak.orders),
                        )}
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}

/** Horizontal bars with the name inside and the value at the end. */
function HorizontalBars({
    title,
    description,
    rows,
    color,
}: {
    title: string;
    description: string;
    rows: { key: string; label: string; value: number; count: number }[];
    color: string;
}) {
    const { t } = useI18n();
    const config = {
        value: { label: t('reports.revenue'), color },
        label: { color: 'var(--background)' },
    } satisfies ChartConfig;
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {rows.length === 0 ? (
                    <EmptyChart text={t('reports.noData')} />
                ) : (
                    <ChartContainer
                        config={config}
                        className="aspect-auto w-full"
                        style={{ height: 44 * rows.length + 16 }}
                    >
                        <BarChart
                            data={rows}
                            layout="vertical"
                            margin={{ right: 72 }}
                        >
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="label" type="category" hide />
                            <XAxis dataKey="value" type="number" hide />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        hideLabel
                                        formatter={(value, _n, item) =>
                                            moneyRow(
                                                color,
                                                (
                                                    item.payload as {
                                                        label: string;
                                                    }
                                                ).label,
                                                Number(value),
                                                t(
                                                    'reports.ordersCount',
                                                ).replace(
                                                    '{count}',
                                                    String(
                                                        (
                                                            item.payload as {
                                                                count: number;
                                                            }
                                                        ).count,
                                                    ),
                                                ),
                                            )
                                        }
                                    />
                                }
                            />
                            <Bar
                                dataKey="value"
                                fill="var(--color-value)"
                                radius={6}
                                barSize={32}
                            >
                                <LabelList
                                    dataKey="label"
                                    position="insideLeft"
                                    offset={10}
                                    className="fill-(--color-label) font-medium"
                                    fontSize={12}
                                />
                                <LabelList
                                    dataKey="value"
                                    position="right"
                                    offset={8}
                                    className="fill-foreground font-semibold"
                                    fontSize={12}
                                    formatter={(v: unknown) =>
                                        formatPrice(Number(v))
                                    }
                                />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}

/* ───────────────────────── Lists ───────────────────────── */

function TopProducts({ r }: { r: SalesReport }) {
    const { t } = useI18n();
    const max = Math.max(1, ...r.topProducts.map((p) => p.revenue));
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('reports.topProducts')}</CardTitle>
                <CardDescription>
                    {t('reports.topProductsDesc')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {r.topProducts.length === 0 ? (
                    <EmptyChart text={t('reports.noData')} />
                ) : (
                    <ol className="space-y-1">
                        {r.topProducts.map((p, i) => {
                            const src = getFileUrl(p.imageUrl);
                            return (
                                <li key={p.productId}>
                                    <Link
                                        href={`/dashboard/products/${p.productId}`}
                                        className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/60"
                                    >
                                        <span
                                            className={cn(
                                                'w-5 text-center text-xs font-bold tabular-nums',
                                                i === 0
                                                    ? 'text-amber-500'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            {i + 1}
                                        </span>
                                        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
                                            {src ? (
                                                <Image
                                                    src={src}
                                                    alt={p.name}
                                                    width={40}
                                                    height={40}
                                                    className="size-full object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <ImageIcon className="size-4 text-muted-foreground/40" />
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium">
                                                {p.name}
                                            </span>
                                            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                                                <span
                                                    className="block h-full rounded-full bg-pink-500"
                                                    style={{
                                                        width: `${(p.revenue / max) * 100}%`,
                                                    }}
                                                />
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-right">
                                            <span className="block text-sm font-semibold tabular-nums">
                                                {formatPrice(p.revenue)}
                                            </span>
                                            <span className="block text-[11px] tabular-nums text-muted-foreground">
                                                {t('reports.soldCount').replace(
                                                    '{count}',
                                                    String(p.quantity),
                                                )}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </CardContent>
        </Card>
    );
}

function TopCustomers({ r }: { r: SalesReport }) {
    const { t } = useI18n();
    const initials = (n: string) =>
        n
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase() || '?';
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('reports.topCustomers')}</CardTitle>
                <CardDescription>
                    {t('reports.topCustomersDesc')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {r.topCustomers.length === 0 ? (
                    <EmptyChart text={t('reports.noData')} />
                ) : (
                    <ul className="divide-y divide-border/60">
                        {r.topCustomers.map((c, i) => (
                            <li
                                key={c.key}
                                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                            >
                                <span
                                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                    style={{
                                        background: PALETTE[i % PALETTE.length],
                                    }}
                                >
                                    {initials(c.name)}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">
                                        {c.name || t('reports.guest')}
                                    </span>
                                    {c.phone && (
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {c.phone}
                                        </span>
                                    )}
                                </span>
                                <span className="shrink-0 text-right">
                                    <span className="block text-sm font-semibold tabular-nums">
                                        {formatPrice(c.revenue)}
                                    </span>
                                    <span className="block text-[11px] text-muted-foreground">
                                        {t('reports.ordersCount').replace(
                                            '{count}',
                                            String(c.orders),
                                        )}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function MiniStat({
    icon: Icon,
    title,
    value,
}: {
    icon: typeof Package;
    title: string;
    value: string;
}) {
    return (
        <Card size="sm" className="flex-row items-center gap-3 px-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-300">
                <Icon className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                    {title}
                </p>
                <p className="text-lg font-semibold leading-tight tabular-nums">
                    {value}
                </p>
            </div>
        </Card>
    );
}

/* ───────────────────────── page ───────────────────────── */

export default function ReportsPage() {
    const { t, language } = useI18n();
    const branchId = useSelectedBranchId();
    const [preset, setPreset] = useState('30d');
    const [range, setRange] = useState<DateRange>(() =>
        (
            RANGE_PRESETS.find((p) => p.key === '30d') ?? RANGE_PRESETS[1]
        ).range(),
    );
    const {
        data: r,
        isLoading,
        isFetching,
    } = useSalesReport({ from: range.from, to: range.to, branchId });

    const [exporting, setExporting] = useState(false);
    async function exportCsv() {
        setExporting(true);
        try {
            const data = await fetchOrderExport({
                from: range.from,
                to: range.to,
                branchId,
            });
            // BOM so Excel reads Khmer names as UTF-8.
            const blob = new Blob(['﻿' + toCsv(data.rows, t)], {
                type: 'text/csv;charset=utf-8',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders_${data.range.from}_to_${data.range.to}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    }

    function pickPreset(key: string) {
        const p = RANGE_PRESETS.find((x) => x.key === key);
        if (!p) return;
        setPreset(key);
        setRange(p.range());
    }

    const s = r?.summary;
    const prev = r?.previous;
    const longDate: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    };
    const rangeText = r
        ? `${fmtDate(r.range.from, language, longDate)} – ${fmtDate(r.range.to, language, longDate)}`
        : '';
    const vsPrev = t('reports.vsPrevious');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('reports.title')}
                    </h1>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {t('reports.subtitle')}
                        {rangeText && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                                <CalendarRange className="size-3" />
                                {rangeText}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangeFilter
                        value={preset}
                        onChange={(key, next) => {
                            setPreset(key);
                            setRange(next);
                        }}
                    />
                    <Button
                        size="sm"
                        onClick={exportCsv}
                        disabled={!s?.allOrders || exporting}
                        className="rounded-full bg-pink-500 text-white hover:bg-pink-600 dark:bg-pink-700 dark:hover:bg-pink-800"
                    >
                        {exporting ? (
                            <Loader className="size-4 animate-spin" />
                        ) : (
                            <Download className="size-4" />
                        )}
                        {t('reports.export')}
                    </Button>
                </div>
            </div>

            {isLoading || !r || !s || !prev ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-36 animate-pulse rounded-xl bg-muted"
                            />
                        ))}
                    </div>
                    <div className="h-96 animate-pulse rounded-xl bg-muted" />
                </div>
            ) : s.allOrders === 0 ? (
                /* Nothing in this window — offer longer ranges. */
                <Card className="items-center border-dashed px-6 py-16 text-center">
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500">
                        <Inbox className="size-7" />
                    </span>
                    <div>
                        <p className="text-base font-semibold">
                            {t('reports.emptyTitle')}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('reports.emptyBody')}
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        {RANGE_PRESETS.filter(
                            (p) =>
                                ['90d', 'year', 'all'].includes(p.key) &&
                                p.key !== preset,
                        ).map((p) => (
                            <Button
                                key={p.key}
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => pickPreset(p.key)}
                            >
                                {t(p.label)}
                            </Button>
                        ))}
                    </div>
                </Card>
            ) : (
                <div
                    className={cn(
                        'space-y-6 transition-opacity',
                        isFetching && 'opacity-60',
                    )}
                >
                    {/* KPI cards (shadcn "section cards") */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            title={t('reports.revenue')}
                            value={formatPrice(s.revenue)}
                            trend={change(s.revenue, prev.revenue)}
                            footer={vsPrev}
                            sub={t('reports.prevValue').replace(
                                '{value}',
                                formatPrice(prev.revenue),
                            )}
                        />
                        <KpiCard
                            title={t('reports.sales')}
                            value={s.orders.toLocaleString()}
                            trend={change(s.orders, prev.orders)}
                            footer={t('reports.ofOrders').replace(
                                '{count}',
                                String(s.allOrders),
                            )}
                            sub={t('reports.prevValue').replace(
                                '{value}',
                                String(prev.orders),
                            )}
                        />
                        <KpiCard
                            title={t('reports.avgOrder')}
                            value={formatPrice(s.avgOrderValue)}
                            trend={change(s.avgOrderValue, prev.avgOrderValue)}
                            footer={vsPrev}
                            sub={t('reports.prevValue').replace(
                                '{value}',
                                formatPrice(prev.avgOrderValue),
                            )}
                        />
                        <KpiCard
                            title={t('reports.customers')}
                            value={s.customers.toLocaleString()}
                            trend={change(s.customers, prev.customers)}
                            footer={t('reports.newCustomers').replace(
                                '{count}',
                                String(r.newCustomers),
                            )}
                            sub={t('reports.prevValue').replace(
                                '{value}',
                                String(prev.customers),
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <MiniStat
                            icon={Package}
                            title={t('reports.itemsSold')}
                            value={s.itemsSold.toLocaleString()}
                        />
                        <MiniStat
                            icon={TicketPercent}
                            title={t('reports.discounts')}
                            value={formatPrice(s.discounts)}
                        />
                        <MiniStat
                            icon={Truck}
                            title={t('reports.shipping')}
                            value={formatPrice(s.shipping)}
                        />
                        <MiniStat
                            icon={Percent}
                            title={t('reports.cancelRate')}
                            value={`${((s.cancelled / (s.allOrders || 1)) * 100).toFixed(0)}%`}
                        />
                    </div>

                    {/* Interactive area chart + completion gauge */}
                    <div className="grid gap-6 xl:grid-cols-3">
                        <div className="xl:col-span-2">
                            <RevenueChart r={r} />
                        </div>
                        <CompletionChart r={r} />
                    </div>

                    {/* Donuts */}
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        <DonutCard
                            title={t('reports.byStatus')}
                            description={t('reports.byStatusDesc')}
                            centerValue={s.allOrders.toLocaleString()}
                            centerLabel={t('reports.orders')}
                            rows={r.byStatus.map((st) => ({
                                key: st.status,
                                label: label(STATUS_LABEL, st.status, t),
                                value: st.orders,
                                color: STATUS_COLOR[st.status] ?? '#a1a1aa',
                            }))}
                        />
                        <DonutCard
                            title={t('reports.byPayment')}
                            description={t('reports.byPaymentDesc')}
                            centerValue={compactMoney(s.revenue)}
                            centerLabel={t('reports.revenue')}
                            money
                            rows={r.byPaymentMethod.map((p, i) => ({
                                key: `pay-${p.method}`,
                                label: label(PAY_LABEL, p.method, t),
                                value: p.amount,
                                color: PALETTE[i % PALETTE.length],
                                extra: t('reports.ordersCount').replace(
                                    '{count}',
                                    String(p.count),
                                ),
                            }))}
                        />
                        <DonutCard
                            title={t('reports.byDelivery')}
                            description={t('reports.byDeliveryDesc')}
                            centerValue={s.orders.toLocaleString()}
                            centerLabel={t('reports.salesLower')}
                            money
                            rows={r.byDelivery.map((d, i) => ({
                                key: `del-${d.method}`,
                                label: label(DELIVERY_LABEL, d.method, t),
                                value: d.revenue,
                                color: PALETTE[(i + 2) % PALETTE.length],
                                extra: t('reports.ordersCount').replace(
                                    '{count}',
                                    String(d.orders),
                                ),
                            }))}
                        />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <TopProducts r={r} />
                        <TopCustomers r={r} />
                    </div>

                    <div
                        className={cn(
                            'grid gap-6',
                            !branchId &&
                                r.byBranch.length > 1 &&
                                'lg:grid-cols-2',
                        )}
                    >
                        <HoursChart r={r} />
                        {!branchId && r.byBranch.length > 1 && (
                            <HorizontalBars
                                title={t('reports.byBranch')}
                                description={t('reports.byBranchDesc')}
                                color="#8b5cf6"
                                rows={r.byBranch.map((b) => ({
                                    key: b.branchId,
                                    label: b.name,
                                    value: b.revenue,
                                    count: b.orders,
                                }))}
                            />
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {t('reports.note')}
                    </p>
                </div>
            )}
        </div>
    );
}
