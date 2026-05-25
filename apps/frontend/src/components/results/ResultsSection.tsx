'use client';

import React, { useState } from 'react';
import { Clock, Database, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BusinessTable } from './BusinessTable';
import { ExportMenu } from './ExportMenu';
import type { SearchResponse, Business } from '@gmaps-scraper/shared-types';

interface ResultsSectionProps {
  results: SearchResponse;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold text-sm">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ResultsSection({ results }: ResultsSectionProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const cacheAge = results.cacheAge
    ? results.cacheAge < 3600
      ? `${Math.floor(results.cacheAge / 60)}m ago`
      : `${Math.floor(results.cacheAge / 3600)}h ago`
    : null;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            {results.category}{' '}
            <span className="text-muted-foreground font-normal">in</span>{' '}
            {results.location}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant={results.fromCache ? 'warning' : 'success'}>
              {results.fromCache ? (
                <><Database className="w-3 h-3 mr-1" />Cached{cacheAge ? ` · ${cacheAge}` : ''}</>
              ) : (
                <><RefreshCw className="w-3 h-3 mr-1" />Fresh scrape</>
              )}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {results.totalResults} results · {new Date(results.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        <ExportMenu
          searchId={results.searchId}
          category={results.category}
          location={results.location}
          selectedIds={selectedIds}
          totalResults={results.totalResults}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Businesses" value={results.totalResults.toString()} icon={TrendingUp} />
        <StatCard
          label="Avg Rating"
          value={
            results.businesses.filter((b) => b.rating).length > 0
              ? (
                  results.businesses.reduce((s, b) => s + (b.rating ?? 0), 0) /
                  results.businesses.filter((b) => b.rating).length
                ).toFixed(1)
              : '—'
          }
          icon={TrendingUp}
        />
        <StatCard
          label="With Phone"
          value={results.businesses.filter((b) => b.phoneNumber).length.toString()}
          icon={Database}
        />
        <StatCard
          label="With Website"
          value={results.businesses.filter((b) => b.website).length.toString()}
          icon={Database}
        />
      </div>

      {/* Table */}
      <BusinessTable
        searchId={results.searchId}
        initialData={results.businesses}
        totalResults={results.totalResults}
        onSelectionChange={setSelectedIds}
      />
    </div>
  );
}
