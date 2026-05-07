'use client';

import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandFormDialog } from '@/features/brands/components/brand-form-dialog';
import { BrandTable } from '@/features/brands/components/brand-table';
import { DeleteBrandDialog } from '@/features/brands/components/delete-brand-dialog';
import { useBrands } from '@/features/brands/use-brands';
import { useI18n } from '@/lib/i18n';
import type { Brand, BrandStatus } from '@/types/brand';

const PAGE_SIZE = 10;

export default function BrandsPage() {
    const { t } = useI18n();

    // Filters
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<BrandStatus | 'all'>('all');

    // Dialog state
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

    // Data
    const { data, isLoading, isFetching } = useBrands({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
    });

    const brands = data?.data ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    function openCreate() {
        setEditingBrand(null);
        setFormDialogOpen(true);
    }

    function openEdit(brand: Brand) {
        setEditingBrand(brand);
        setFormDialogOpen(true);
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {t('brand.list.title')}
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        {t('brand.list.subtitle')}
                    </p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="mr-2 size-4" />
                    {t('brand.action.create')}
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('brand.list.search')}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9"
                        />
                    </div>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                            setStatusFilter(value as BrandStatus | 'all');
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('brand.status.all')}</SelectItem>
                            <SelectItem value="active">{t('brand.status.active')}</SelectItem>
                            <SelectItem value="inactive">
                                {t('brand.status.inactive')}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Table card */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="space-y-3 p-6">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div
                            className={
                                isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'
                            }
                        >
                            <BrandTable
                                brands={brands}
                                onEdit={openEdit}
                                onDelete={setDeletingBrand}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {(page - 1) * PAGE_SIZE + 1}–
                        {Math.min(page * PAGE_SIZE, total)} of {total}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isFetching}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || isFetching}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Dialogs */}
            <BrandFormDialog
                open={formDialogOpen}
                onOpenChange={(open) => {
                    setFormDialogOpen(open);
                    if (!open) setEditingBrand(null);
                }}
                brand={editingBrand}
            />
            <DeleteBrandDialog
                brand={deletingBrand}
                onOpenChange={(open) => {
                    if (!open) setDeletingBrand(null);
                }}
            />
        </div>
    );
}