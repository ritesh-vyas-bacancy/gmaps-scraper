import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import type { Business, BusinessRow, PaginatedResponse, PaginationParams } from '@gmaps-scraper/shared-types';

/** Bulk-insert businesses for a search, deleting old ones first on refresh */
export async function saveBusinesses(searchId: string, businesses: Business[]): Promise<void> {
  if (businesses.length === 0) return;

  // Delete previous records for this searchId (handles force-refresh)
  await supabase.from('businesses').delete().eq('search_id', searchId);

  const rows = businesses.map((b) => ({
    search_id: searchId,
    business_name: b.businessName,
    business_category: b.businessCategory,
    rating: b.rating,
    total_reviews: b.totalReviews,
    address: b.address,
    phone_number: b.phoneNumber,
    website: b.website,
    google_maps_url: b.googleMapsUrl,
    latitude: b.latitude,
    longitude: b.longitude,
    working_hours: b.workingHours,
    thumbnail_image: b.thumbnailImage,
    scraped_at: b.scrapedAt,
  }));

  // Insert in batches of 100 to avoid payload limits
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('businesses').insert(batch);
    if (error) {
      logger.error('Failed to insert businesses batch', { error, batchIndex: i });
      throw new Error(`Failed to insert businesses: ${error.message}`);
    }
  }

  logger.info(`Saved ${businesses.length} businesses for search ${searchId}`);
}

/** Fetch paginated businesses for a search */
export async function getBusinesses(
  searchId: string,
  params: PaginationParams,
): Promise<PaginatedResponse<Business>> {
  const { page = 1, pageSize = 25, sortBy = 'rating', sortOrder = 'desc', search } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('businesses')
    .select('*', { count: 'exact' })
    .eq('search_id', searchId);

  if (search) {
    query = query.or(
      `business_name.ilike.%${search}%,address.ilike.%${search}%,phone_number.ilike.%${search}%`,
    );
  }

  // Allowed sort columns
  const allowedSorts = ['business_name', 'rating', 'total_reviews', 'address', 'business_category'];
  const col = allowedSorts.includes(sortBy) ? sortBy : 'rating';
  query = query
    .order(col, { ascending: sortOrder === 'asc', nullsFirst: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch businesses: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data as BusinessRow[]).map(rowToBusiness),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** Fetch ALL businesses for a search (used by export) */
export async function getAllBusinesses(searchId: string): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('search_id', searchId)
    .order('rating', { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Failed to fetch businesses: ${error.message}`);
  return (data as BusinessRow[]).map(rowToBusiness);
}

function rowToBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    searchId: row.search_id,
    businessName: row.business_name,
    businessCategory: row.business_category,
    rating: row.rating,
    totalReviews: row.total_reviews,
    address: row.address,
    phoneNumber: row.phone_number,
    website: row.website,
    googleMapsUrl: row.google_maps_url,
    latitude: row.latitude,
    longitude: row.longitude,
    workingHours: row.working_hours,
    thumbnailImage: row.thumbnail_image,
    scrapedAt: row.scraped_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
