'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Copy,
  ExternalLink,
  MapPin,
  Search,
  Star,
  Phone,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatNumber, formatRating, truncateUrl } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import type { Business } from '@gmaps-scraper/shared-types';

const columnHelper = createColumnHelper<Business>();

interface BusinessTableProps {
  searchId: string;
  initialData: Business[];
  totalResults: number;
  onSelectionChange: (ids: string[]) => void;
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      <span className="text-sm font-medium">{formatRating(rating)}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          toast({ title: 'Copied!', description: text, duration: 2000 });
        });
      }}
      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
      aria-label="Copy"
    >
      <Copy className="w-3 h-3 text-muted-foreground" />
    </button>
  );
}

export function BusinessTable({
  searchId: _searchId,
  initialData,
  onSelectionChange,
}: BusinessTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'rating', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pageSize, setPageSize] = useState(25);

  const columns = useMemo(
    () => [
      // Selection checkbox
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 rounded border-input cursor-pointer"
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 rounded border-input cursor-pointer"
            aria-label="Select row"
          />
        ),
        size: 40,
      }),

      // Business name
      columnHelper.accessor('businessName', {
        header: 'Business',
        cell: ({ getValue, row }) => (
          <div className="group flex items-start gap-2 min-w-[180px]">
            {row.original.thumbnailImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.original.thumbnailImage}
                alt=""
                className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-blue-500" />
              </div>
            )}
            <div>
              <p className="font-medium text-sm leading-tight">{getValue()}</p>
              {row.original.businessCategory && (
                <p className="text-xs text-muted-foreground mt-0.5">{row.original.businessCategory}</p>
              )}
            </div>
          </div>
        ),
      }),

      // Rating
      columnHelper.accessor('rating', {
        header: 'Rating',
        cell: ({ getValue }) => <RatingStars rating={getValue()} />,
        size: 90,
      }),

      // Reviews
      columnHelper.accessor('totalReviews', {
        header: 'Reviews',
        cell: ({ getValue }) => (
          <span className="text-sm">{formatNumber(getValue())}</span>
        ),
        size: 90,
      }),

      // Phone
      columnHelper.accessor('phoneNumber', {
        header: () => (
          <span className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" /> Phone
          </span>
        ),
        cell: ({ getValue }) => {
          const phone = getValue();
          if (!phone) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <div className="group flex items-center">
              <span className="text-sm font-mono">{phone}</span>
              <CopyButton text={phone} />
            </div>
          );
        },
        size: 150,
      }),

      // Website
      columnHelper.accessor('website', {
        header: () => (
          <span className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" /> Website
          </span>
        ),
        cell: ({ getValue }) => {
          const url = getValue();
          if (!url) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 max-w-[160px]"
            >
              <span className="truncate">{truncateUrl(url)}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          );
        },
        size: 180,
      }),

      // Address
      columnHelper.accessor('address', {
        header: 'Address',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground max-w-[220px] block truncate" title={getValue() ?? undefined}>
            {getValue() ?? '—'}
          </span>
        ),
        size: 220,
      }),

      // Maps link
      columnHelper.accessor('googleMapsUrl', {
        header: 'Maps',
        cell: ({ getValue }) => {
          const url = getValue();
          if (!url) return null;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <MapPin className="w-3 h-3" /> View
            </a>
          );
        },
        size: 70,
        enableSorting: false,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: initialData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      pagination: { pageIndex: 0, pageSize },
    },
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(next);
      const selected = Object.keys(next).filter((k) => next[k]);
      onSelectionChange(
        selected
          .map((i) => initialData[parseInt(i)]?.id)
          .filter((id): id is string => Boolean(id)),
      );
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id ?? row.businessName,
  });

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Table toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter by name, phone, address…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {selectedCount > 0 && (
            <Badge variant="secondary">{selectedCount} selected</Badge>
          )}
          <span>{table.getFilteredRowModel().rows.length} rows</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap select-none"
                      style={{ width: header.column.getSize() }}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <ChevronUp className="w-3.5 h-3.5" />,
                            desc: <ChevronDown className="w-3.5 h-3.5" />,
                          }[header.column.getIsSorted() as string] ?? (
                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-12 text-center text-muted-foreground">
                    No results found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors',
                      row.getIsSelected() && 'bg-blue-50/50 dark:bg-blue-950/20',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-3 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ·{' '}
          {table.getFilteredRowModel().rows.length} total rows
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(table.getPageCount(), 7) }, (_, i) => i).map((i) => (
            <Button
              key={i}
              variant={table.getState().pagination.pageIndex === i ? 'default' : 'outline'}
              size="sm"
              className="w-9"
              onClick={() => table.setPageIndex(i)}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
