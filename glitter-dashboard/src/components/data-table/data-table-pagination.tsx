'use client';

import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface DataTablePaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    pageSizeOptions?: number[];
    disabled?: boolean;
}

export function DataTablePagination({
                                        page,
                                        pageSize,
                                        total,
                                        onPageChange,
                                        onPageSizeChange,
                                        pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
                                        disabled,
                                    }: DataTablePaginationProps) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endIdx = Math.min(page * pageSize, total);
    const pages = getPaginationRange(page, totalPages);

    if (total === 0) return null;

    function handlePrevious(e: React.MouseEvent<HTMLAnchorElement>) {
        e.preventDefault();
        if (page > 1 && !disabled) onPageChange(page - 1);
    }

    function handleNext(e: React.MouseEvent<HTMLAnchorElement>) {
        e.preventDefault();
        if (page < totalPages && !disabled) onPageChange(page + 1);
    }

    function handlePageClick(
        e: React.MouseEvent<HTMLAnchorElement>,
        p: number,
    ) {
        e.preventDefault();
        if (!disabled) onPageChange(p);
    }

    return (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            {/* Page size selector */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select
                    value={String(pageSize)}
                    onValueChange={(v) => v && onPageSizeChange(Number(v))}
                >
                    <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {pageSizeOptions.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span>per page</span>
            </div>

            {/* Range counter */}
            <p className="text-sm text-muted-foreground">
                {startIdx}–{endIdx} of {total}
            </p>

            {/* Page navigation */}
            {totalPages > 1 && (
                <Pagination className="mx-0 w-auto justify-end">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={handlePrevious}
                                aria-disabled={page === 1 || disabled || undefined}
                                tabIndex={page === 1 || disabled ? -1 : undefined}
                                className={
                                    page === 1 || disabled
                                        ? 'pointer-events-none opacity-50'
                                        : ''
                                }
                            />
                        </PaginationItem>

                        {pages.map((p, idx) =>
                            p === '...' ? (
                                <PaginationItem key={`ellipsis-${idx}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={p}>
                                    <PaginationLink
                                        href="#"
                                        isActive={p === page}
                                        onClick={(e) => handlePageClick(e, p)}
                                        className={
                                            p === page
                                                ? 'border-pink-300 bg-pink-100 text-pink-700 hover:bg-pink-200/80 hover:text-pink-700 dark:border-pink-700 dark:bg-pink-500/20 dark:text-pink-200 dark:hover:bg-pink-500/25 dark:hover:text-pink-200'
                                                : ''
                                        }
                                    >
                                        {p}
                                    </PaginationLink>
                                </PaginationItem>
                            ),
                        )}

                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={handleNext}
                                aria-disabled={page >= totalPages || disabled || undefined}
                                tabIndex={page >= totalPages || disabled ? -1 : undefined}
                                className={
                                    page >= totalPages || disabled
                                        ? 'pointer-events-none opacity-50'
                                        : ''
                                }
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}

function getPaginationRange(
    current: number,
    total: number,
): Array<number | '...'> {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const result: Array<number | '...'> = [];
    const showLeftDots = current > 4;
    const showRightDots = current < total - 3;

    result.push(1);

    if (!showLeftDots && showRightDots) {
        result.push(2, 3, 4, 5, '...', total);
    } else if (showLeftDots && !showRightDots) {
        result.push('...', total - 4, total - 3, total - 2, total - 1, total);
    } else if (showLeftDots && showRightDots) {
        result.push('...', current - 1, current, current + 1, '...', total);
    }

    return result;
}