'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportResults } from '@/lib/api';
import { downloadBlob } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import type { ExportFormat } from '@gmaps-scraper/shared-types';

interface ExportMenuProps {
  searchId: string;
  category: string;
  location: string;
  selectedIds: string[];
  totalResults: number;
}

export function ExportMenu({ searchId, selectedIds, totalResults }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleExport(format: ExportFormat, onlySelected: boolean) {
    setOpen(false);
    setIsExporting(true);
    try {
      const ids = onlySelected && selectedIds.length > 0 ? selectedIds : undefined;
      const blob = await exportResults(searchId, format, ids);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `export-${dateStr}.${format}`;
      downloadBlob(blob, filename);
      toast({
        variant: 'success',
        title: 'Export ready',
        description: `Downloaded ${format.toUpperCase()} with ${ids ? ids.length : totalResults} rows`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Failed to generate export',
      });
    } finally {
      setIsExporting(false);
    }
  }

  const hasSelection = selectedIds.length > 0;

  return (
    <div className="relative">
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          onClick={() => handleExport('xlsx', false)}
          className="gap-1.5"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />}
          Export XLSX
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-md border bg-popover shadow-md py-1">
            <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Export all ({totalResults})
            </p>
            <button
              type="button"
              onClick={() => handleExport('xlsx', false)}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv', false)}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              CSV (.csv)
            </button>

            {hasSelection && (
              <>
                <div className="border-t my-1" />
                <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Export selected ({selectedIds.length})
                </p>
                <button
                  type="button"
                  onClick={() => handleExport('xlsx', true)}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Selected as Excel
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('csv', true)}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  Selected as CSV
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
