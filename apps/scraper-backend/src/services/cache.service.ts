import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import type { CacheStatus, SearchRow } from '../types/shared.js';

const CACHE_TTL_DAYS = parseInt(process.env.CACHE_TTL_DAYS ?? '3', 10);

export async function checkCache(searchKey: string): Promise<CacheStatus> {
  const { data, error } = await supabase
    .from('searches')
    .select('id, cache_expiry_at, created_at')
    .eq('search_key', searchKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { exists: false, isExpired: false };
  }

  const expiryAt = new Date(data.cache_expiry_at);
  const now = new Date();
  const isExpired = now > expiryAt;
  const ageSeconds = Math.floor((now.getTime() - new Date(data.created_at).getTime()) / 1000);

  logger.debug('Cache check', { searchKey, isExpired, ageSeconds });

  return {
    exists: true,
    isExpired,
    ageSeconds,
    searchId: data.id,
  };
}

export async function getCachedSearch(searchKey: string): Promise<SearchRow | null> {
  const { data, error } = await supabase
    .from('searches')
    .select('*')
    .eq('search_key', searchKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  // Touch last_accessed_at
  await supabase
    .from('searches')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', data.id);

  return data as SearchRow;
}

export async function saveSearch(
  searchKey: string,
  category: string,
  location: string,
  totalResults: number,
): Promise<string> {
  const now = new Date();
  const cacheExpiry = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('searches')
    .upsert(
      {
        search_key: searchKey,
        category,
        location,
        force_refresh: false,
        total_results: totalResults,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        last_accessed_at: now.toISOString(),
        cache_expiry_at: cacheExpiry.toISOString(),
      },
      { onConflict: 'search_key' },
    )
    .select('id')
    .single();

  if (error || !data) {
    logger.error('Failed to save search', { error });
    throw new Error(`Failed to save search: ${error?.message}`);
  }

  return data.id;
}

export async function updateSearchMeta(searchId: string, totalResults: number): Promise<void> {
  const now = new Date();
  const cacheExpiry = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await supabase
    .from('searches')
    .update({
      total_results: totalResults,
      updated_at: now.toISOString(),
      last_accessed_at: now.toISOString(),
      cache_expiry_at: cacheExpiry.toISOString(),
    })
    .eq('id', searchId);
}
