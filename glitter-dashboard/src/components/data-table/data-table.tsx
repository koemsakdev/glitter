"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Server-side sort state: which column, and direction. */
export interface DataTableSort {
  id: string;
  desc: boolean;
}

/**
 * Per-column extras (set via `meta` on a column):
 *  - sortable: header becomes a sort toggle (needs `onSortChange`)
 *  - align:    'right' for numbers (totals, counts)
 *  - className: extra classes for that column's cells
 */
export interface DataTableColumnMeta {
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
}

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  isLoading?: boolean;
  isFetching?: boolean;
  emptyState?: ReactNode;
  hoverable?: boolean;
  /** Current sort (server-side). Columns opt in with `meta.sortable`. */
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  /** Clicking a row (outside links/buttons) calls this, e.g. open details. */
  onRowClick?: (row: TData) => void;
  /** Skeleton rows while loading (match the page size). */
  skeletonRows?: number;
}

export function DataTable<TData>({
  data,
  columns,
  isLoading,
  isFetching,
  emptyState,
  hoverable = true,
  sort,
  onSortChange,
  onRowClick,
  skeletonRows = 5,
}: DataTableProps<TData>) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-lg border bg-card p-4">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="rounded-lg border bg-card">{emptyState}</div>;
  }

  const alignCls = (meta?: DataTableColumnMeta) =>
    meta?.align === "right"
      ? "text-right"
      : meta?.align === "center"
        ? "text-center"
        : "text-left";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card transition-opacity",
        isFetching && "opacity-70",
      )}
    >
      {/* Thin progress bar while a new page/sort loads */}
      {isFetching && (
        <div className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-pink-100 dark:bg-pink-500/10">
          <div className="h-full w-1/3 animate-[loading-bar_1s_ease-in-out_infinite] bg-pink-400 dark:bg-pink-600" />
        </div>
      )}
      {/* Horizontal scroll wrapper for responsiveness */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-160">
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-border/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | DataTableColumnMeta
                    | undefined;
                  const label = header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      );
                  const sortable = Boolean(meta?.sortable && onSortChange);
                  const active = sort?.id === header.column.id;
                  return (
                    <th
                      key={header.id}
                      aria-sort={
                        active
                          ? sort?.desc
                            ? "descending"
                            : "ascending"
                          : undefined
                      }
                      className={cn(
                        "whitespace-nowrap px-4 py-3",
                        alignCls(meta),
                      )}
                      style={{
                        width:
                          header.column.columnDef.size !== undefined
                            ? header.column.columnDef.size
                            : undefined,
                      }}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() =>
                            onSortChange!({
                              id: header.column.id,
                              // New column: start descending (biggest /
                              // newest first); same column: flip.
                              desc: active ? !sort!.desc : true,
                            })
                          }
                          className={cn(
                            "-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 uppercase tracking-wider transition-colors hover:bg-muted hover:text-foreground",
                            active && "text-foreground",
                            meta?.align === "right" && "flex-row-reverse",
                          )}
                        >
                          {label}
                          {active ? (
                            sort?.desc ? (
                              <ArrowDown className="size-3.5 text-pink-500" />
                            ) : (
                              <ArrowUp className="size-3.5 text-pink-500" />
                            )
                          ) : (
                            <ChevronsUpDown className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/50">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={
                  onRowClick
                    ? (e) => {
                        // Let links/buttons inside the row work normally.
                        if (
                          (e.target as HTMLElement).closest(
                            "a,button,input,[role=menuitem]",
                          )
                        )
                          return;
                        onRowClick(row.original);
                      }
                    : undefined
                }
                className={cn(
                  "group transition-colors",
                  hoverable && "hover:bg-pink-50/40 dark:hover:bg-pink-500/5",
                  onRowClick && "cursor-pointer",
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | DataTableColumnMeta
                    | undefined;
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-4 py-2.5 align-middle",
                        alignCls(meta),
                        meta?.className,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
