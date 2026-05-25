import { buildSearchKey } from '../lib/helpers.js';
import { checkCache, getCachedSearch, saveSearch, updateSearchMeta } from './cache.service.js';
import { runScraper } from './scraper.service.js';
import { saveBusinesses, getBusinesses } from './business.service.js';
import { logger } from '../lib/logger.js';
import type { SearchResponse, PaginationParams } from '../types/shared.js';

export async function executeSearch(
  category: string,
  location: string,
  forceRefresh = false,
): Promise<SearchResponse> {
  const searchKey = buildSearchKey(category, location);
  logger.info('Executing search', { searchKey, forceRefresh });

  // Check cache
  const cacheStatus = await checkCache(searchKey);
  const shouldScrape = forceRefresh || !cacheStatus.exists || cacheStatus.isExpired;

  if (!shouldScrape && cacheStatus.searchId) {
    // Return cached results
    logger.info('Returning cached results', { searchKey, ageSeconds: cacheStatus.ageSeconds });
    const cached = await getCachedSearch(searchKey);
    if (!cached) throw new Error('Cache inconsistency — search record missing');

    const paginated = await getBusinesses(cached.id, { page: 1, pageSize: 100 });
    return {
      searchId: cached.id,
      searchKey,
      category,
      location,
      totalResults: paginated.total,
      fromCache: true,
      cacheAge: cacheStatus.ageSeconds,
      businesses: paginated.data,
      createdAt: cached.created_at,
    };
  }

  // Run fresh scrape
  logger.info('Running fresh scrape', { searchKey });
  const scraperResult = await runScraper(category, location);

  // Persist
  const searchId = await saveSearch(searchKey, category, location, scraperResult.totalFound);
  await saveBusinesses(searchId, scraperResult.businesses);
  await updateSearchMeta(searchId, scraperResult.totalFound);

  return {
    searchId,
    searchKey,
    category,
    location,
    totalResults: scraperResult.totalFound,
    fromCache: false,
    businesses: scraperResult.businesses,
    createdAt: scraperResult.scrapedAt,
  };
}

export async function getSearchResults(
  searchId: string,
  params: PaginationParams,
) {
  return getBusinesses(searchId, params);
}
