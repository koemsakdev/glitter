"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  isLoading?: boolean;
  isFetching?: boolean;
  emptyState?: ReactNode;
  hoverable?: boolean;
}

export function DataTable<TData>({
  data,
  columns,
  isLoading,
  isFetching,
  emptyState,
  hoverable = true,
}: DataTableProps<TData>) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-lg border bg-card p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="rounded-lg border bg-card">{emptyState}</div>;
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-card ${
        isFetching ? "opacity-60 transition-opacity" : "transition-opacity"
      }`}
    >
      {/* Horizontal scroll wrapper for responsiveness */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-160">
          <thead className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground border-b border-border/50"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-4 py-3"
                    style={{
                      width:
                        header.column.columnDef.size !== undefined
                          ? header.column.columnDef.size
                          : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/50">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`group transition-colors ${
                  hoverable
                    ? "hover:bg-slate-50/25 dark:hover:bg-slate-950/5"
                    : ""
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
