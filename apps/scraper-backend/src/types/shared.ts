// Inlined from packages/shared-types — kept in sync manually

export interface SearchRequest {
  category: string;
  location: string;
  forceRefresh?: boolean;
}

export interface SearchResponse {
  searchId: string;
  searchKey: string;
  category: string;
  location: string;
  totalResults: number;
  fromCache: boolean;
  cacheAge?: number;
  businesses: Business[];
  createdAt: string;
}

export interface CacheStatus {
  exists: boolean;
  isExpired: boolean;
  ageSeconds?: number;
  searchId?: string;
}

export interface Business {
  id?: string;
  searchId?: string;
  businessName: string;
  businessCategory: string;
  rating: number | null;
  totalReviews: number | null;
  address: string | null;
  phoneNumber: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  workingHours: WorkingHours | null;
  thumbnailImage: string | null;
  scrapedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkingHours {
  [day: string]: string | undefined;
  isOpen?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ExportFormat = 'xlsx' | 'csv';

export interface ExportRequest {
  searchId: string;
  format: ExportFormat;
  selectedIds?: string[];
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface ScraperOptions {
  query: string;
  maxResults: number;
  headless: boolean;
  timeout: number;
}

export interface ScraperResult {
  businesses: Business[];
  totalFound: number;
  scrapedAt: string;
  duration: number;
}

export interface SearchRow {
  id: string;
  search_key: string;
  category: string;
  location: string;
  force_refresh: boolean;
  total_results: number;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  cache_expiry_at: string;
}

export interface BusinessRow {
  id: string;
  search_id: string;
  business_name: string;
  business_category: string;
  rating: number | null;
  total_reviews: number | null;
  address: string | null;
  phone_number: string | null;
  website: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  working_hours: WorkingHours | null;
  thumbnail_image: string | null;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface ExportRow {
  id: string;
  search_id: string;
  export_type: ExportFormat;
  created_at: string;
}
