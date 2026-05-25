// ─── Search & Cache ────────────────────────────────────────────────────────

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
  cacheAge?: number; // seconds
  businesses: Business[];
  createdAt: string;
}

export interface CacheStatus {
  exists: boolean;
  isExpired: boolean;
  ageSeconds?: number;
  searchId?: string;
}

// ─── Business ──────────────────────────────────────────────────────────────

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

// ─── Pagination ────────────────────────────────────────────────────────────

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

// ─── Export ────────────────────────────────────────────────────────────────

export type ExportFormat = 'xlsx' | 'csv';

export interface ExportRequest {
  searchId: string;
  format: ExportFormat;
  selectedIds?: string[];
}

// ─── API Error ─────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

// ─── Scraper ───────────────────────────────────────────────────────────────

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
  duration: number; // ms
}

// ─── DB Rows (snake_case mirrors Supabase) ─────────────────────────────────

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

// ─── Category ──────────────────────────────────────────────────────────────

export interface Category {
  label: string;
  value: string;
  icon?: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { label: 'Hospitals', value: 'hospitals' },
  { label: 'Hotels', value: 'hotels' },
  { label: 'Schools', value: 'schools' },
  { label: 'Restaurants', value: 'restaurants' },
  { label: 'Shopping Malls', value: 'shopping malls' },
  { label: 'Cinemas', value: 'cinemas' },
  { label: 'Gyms', value: 'gyms' },
  { label: 'Cafes', value: 'cafes' },
  { label: 'Clinics', value: 'clinics' },
  { label: 'Salons', value: 'salons' },
  { label: 'Pharmacies', value: 'pharmacies' },
  { label: 'Banks', value: 'banks' },
  { label: 'Supermarkets', value: 'supermarkets' },
  { label: 'Gas Stations', value: 'gas stations' },
  { label: 'Dentists', value: 'dentists' },
  { label: 'Lawyers', value: 'lawyers' },
  { label: 'Real Estate Agencies', value: 'real estate agencies' },
  { label: 'Car Dealers', value: 'car dealers' },
  { label: 'Bakeries', value: 'bakeries' },
  { label: 'Libraries', value: 'libraries' },
];
