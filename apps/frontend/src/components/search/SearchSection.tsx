'use client';

import React, { useState } from 'react';
import { SearchForm } from './SearchForm';
import { LoadingOverlay } from './LoadingOverlay';
import { ResultsSection } from '../results/ResultsSection';
import { searchBusinesses } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import type { SearchResponse } from '@gmaps-scraper/shared-types';

export function SearchSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);

  async function handleSearch(category: string, location: string, forceRefresh: boolean) {
    setIsLoading(true);
    try {
      const data = await searchBusinesses({ category, location, forceRefresh });
      setResults(data);
      toast({
        variant: 'success',
        title: data.fromCache ? 'Loaded from cache' : 'Scrape complete',
        description: `Found ${data.totalResults} businesses for "${category} in ${location}"`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <SearchForm onSearch={handleSearch} isLoading={isLoading} />
      {isLoading && <LoadingOverlay />}
      {!isLoading && results && <ResultsSection results={results} />}
    </div>
  );
}
