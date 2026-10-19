'use client';

import {
    Download,
    Package,
    Receipt,
    ShoppingBag,
    TicketPercent,
    Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    DateRangeFilter,
    RANGE_PRESETS,
    type DateRange,
} from '@/features/dashboard/components/date-range-filter';
import { SalesChart } from '@/features/dashboard/components/sales-chart';
import { StatCard } from '@/features/dashboard/components/stat-card';
import { useSalesReport, type SalesReport } from '@/features/reports/reports-api';
import { formatPrice } from '@/lib/formatters';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useSelectedBranchId } from '@/stores/use-branch-context';

const PAY_LABEL: Record<string, TranslationKey> = {
    cash: 'order.payment.method.cash',
    khqr: 'order.payment.method.khqr',
    aba: 'reports.method.aba',
};
const SOURCE_LABEL: Record<string, TranslationKey> = {
    in_store: 'order.source.in_store',
    online: 'order.source.online',
};

/** Build a CSV with every section of the report. */
function toCsv(r: SalesReport, t: (k: TranslationKey) => string): string {
    const esc = (v: unknown) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows: unknown[][] = [];
    const section = (title: string, head: string[], body: unknown[][]) => {
        rows.push([title], head, ...body, []);
    };
    section(t('reports.summary'), ['From', 'To', 'Revenue', 'Orders', 'Items sold', 'Avg order', 'Discounts'], [[
        r.range.from, r.range.to, r.summary.revenue.toFixed(2), r.summary.orders,
        r.summary.itemsSold, r.summary.avgOrderValue.toFixed(2), r.summary.discounts.toFixed(2),
    ]]);
    section(t('reports.byDay'), ['Day', 'Orders', 'Revenue'], r.byDay.map((d) => [d.day, d.orders, d.revenue.toFixed(2)]));
    section(t('reports.byPayment'), ['Method', 'Orders', 'Amount'], r.byPaymentMethod.map((p) => [p.method, p.count, p.amount.toFixed(2)]));
    section(t('reports.bySource'), ['Channel', 'Orders', 'Revenue'], r.bySource.map((s) => [s.source, s.orders, s.revenue.toFixed(2)]));
    section(t('reports.byCashier'), ['Staff', 'Username', 'Sales', 'Revenue'], r.byCashier.map((c) => [c.name, c.username ?? '', c.orders, c.revenue.toFixed(2)]));
    section(t('reports.byBranch'), ['Branch', 'Orders', 'Revenue'], r.byBranch.map((b) => [b.name, b.orders, b.revenue.toFixed(2)]));
    section(t('reports.topProducts'), ['Product', 'Quantity', 'Revenue'], r.topProducts.map((p) => [p.name, p.quantity, p.revenue.toFixed(2)]));
    return rows.map((row) => row.map(esc).join(',')).join('\n');
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="border-b px-5 py-3.5 text-sm font-semibold">{title}</div>
            {children}
        </div>
    );
}

/** A ranked list with share-of-total bars. */
function BreakdownTable({
    rows,
    empty,
    valueHeader,
    countHeader,
}: {
    rows: { key: string; label: ReactNode; sub?: ReactNode; count: number; value: number }[];
    empty: string;
    valueHeader: string;
    countHeader: string;
}) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    if (rows.length === 0) {
        return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</p>;
    }
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2 text-left font-medium" />
                    <th className="px-3 py-2 text-right font-medium">{countHeader}</th>
                    <th className="px-5 py-2 text-right font-medium">{valueHeader}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
                {rows.map((r) => (
                    <tr key={r.key}>
                        <td className="px-5 py-2.5">
                            <div className="font-medium">{r.label}</div>
                            {r.sub && <div className="text-xs text-muted-foreground">{r.sub}</div>}
                            <div className="mt-1.5 h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-pink-400 dark:bg-pink-600" style={{ width: `${(r.value / max) * 100}%` }} />
                            </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{r.count}</td>
                        <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{formatPrice(r.value)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function ReportsPage() {
    const { t } = useI18n();
    const branchId = useSelectedBranchId();
    const [preset, setPreset] = useState('30d');
    const [range, setRange] = useState<DateRange>(() =>
        (RANGE_PRESETS.find((p) => p.key === '30d') ?? RANGE_PRESETS[1]).range(),
    );
    const { data: r, isLoading, isFetching } = useSalesReport({
        from: range.from,
        to: range.to,
        branchId,
    });

    function exportCsv() {
        if (!r) return;
        const blob = new Blob(['﻿' + toCsv(r, t)], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report_${r.range.from}_to_${r.range.to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('reports.title')}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t('reports.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangeFilter
                        value={preset}
                        onChange={(key, next) => {
                            setPreset(key);
                            setRange(next);
                        }}
                    />
                    <Button variant="outline" size="sm" onClick={exportCsv} disabled={!r}>
                        <Download className="mr-1.5 size-4" />
                        {t('reports.export')}
                    </Button>
                </div>
            </div>

            {isLoading || !r ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
                    ))}
                </div>
            ) : (
                <div className={`space-y-6 transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard title={t('reports.revenue')} value={formatPrice(r.summary.revenue)} icon={Wallet} accent="pink" />
                        <StatCard title={t('reports.orders')} value={r.summary.orders} icon={Receipt} accent="blue" />
                        <StatCard title={t('reports.itemsSold')} value={r.summary.itemsSold} icon={Package} accent="emerald" />
                        <StatCard
                            title={t('reports.avgOrder')}
                            value={formatPrice(r.summary.avgOrderValue)}
                            icon={ShoppingBag}
                            accent="amber"
                            hint={r.summary.discounts > 0 ? `${t('reports.discounts')}: ${formatPrice(r.summary.discounts)}` : undefined}
                        />
                    </div>

                    <SalesChart data={r.byDay} granularity="day" rangeLabel={`${r.range.from} → ${r.range.to}`} />

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Panel title={t('reports.byPayment')}>
                            <BreakdownTable
                                rows={r.byPaymentMethod.map((p) => ({
                                    key: p.method,
                                    label: PAY_LABEL[p.method] ? t(PAY_LABEL[p.method]) : p.method,
                                    count: p.count,
                                    value: p.amount,
                                }))}
                                empty={t('reports.noData')}
                                countHeader={t('reports.orders')}
                                valueHeader={t('reports.amount')}
                            />
                        </Panel>
                        <Panel title={t('reports.bySource')}>
                            <BreakdownTable
                                rows={r.bySource.map((s) => ({
                                    key: s.source,
                                    label: SOURCE_LABEL[s.source] ? t(SOURCE_LABEL[s.source]) : s.source,
                                    count: s.orders,
                                    value: s.revenue,
                                }))}
                                empty={t('reports.noData')}
                                countHeader={t('reports.orders')}
                                valueHeader={t('reports.revenue')}
                            />
                        </Panel>
                        <Panel title={t('reports.byCashier')}>
                            <BreakdownTable
                                rows={r.byCashier.map((c) => ({
                                    key: c.cashierId,
                                    label: c.name,
                                    sub: c.username ? `@${c.username}` : undefined,
                                    count: c.orders,
                                    value: c.revenue,
                                }))}
                                empty={t('reports.noCashierSales')}
                                countHeader={t('reports.sales')}
                                valueHeader={t('reports.revenue')}
                            />
                        </Panel>
                        <Panel title={t('reports.topProducts')}>
                            <BreakdownTable
                                rows={r.topProducts.map((p) => ({
                                    key: p.productId,
                                    label: (
                                        <Link href={`/dashboard/products/${p.productId}`} className="hover:text-pink-600 hover:underline">
                                            {p.name}
                                        </Link>
                                    ),
                                    count: p.quantity,
                                    value: p.revenue,
                                }))}
                                empty={t('reports.noData')}
                                countHeader={t('reports.qty')}
                                valueHeader={t('reports.revenue')}
                            />
                        </Panel>
                        {!branchId && (
                            <Panel title={t('reports.byBranch')}>
                                <BreakdownTable
                                    rows={r.byBranch.map((b) => ({
                                        key: b.branchId,
                                        label: b.name,
                                        count: b.orders,
                                        value: b.revenue,
                                    }))}
                                    empty={t('reports.noData')}
                                    countHeader={t('reports.orders')}
                                    valueHeader={t('reports.revenue')}
                                />
                            </Panel>
                        )}
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <TicketPercent className="size-3.5" />
                        {t('reports.note')}
                    </p>
                </div>
            )}
        </div>
    );
}
