import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase.js';
import { getAllBusinesses } from './business.service.js';
import { logger } from '../lib/logger.js';
import type { Business, ExportFormat } from '../types/shared.js';

interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

export async function generateExport(
  searchId: string,
  format: ExportFormat,
  selectedIds?: string[],
): Promise<ExportResult> {
  let businesses: Business[];

  if (selectedIds && selectedIds.length > 0) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .in('id', selectedIds)
      .eq('search_id', searchId);
    if (error) throw new Error(`Export query failed: ${error.message}`);
    businesses = (data ?? []).map((row) => ({
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
    }));
  } else {
    businesses = await getAllBusinesses(searchId);
  }

  if (businesses.length === 0) throw new Error('No businesses to export');

  // Log export event
  await supabase.from('exports').insert({
    search_id: searchId,
    export_type: format,
  });

  const rows = businesses.map((b) => ({
    'Business Name': b.businessName,
    Category: b.businessCategory,
    Rating: b.rating ?? '',
    'Total Reviews': b.totalReviews ?? '',
    Address: b.address ?? '',
    'Phone Number': b.phoneNumber ?? '',
    Website: b.website ?? '',
    'Google Maps URL': b.googleMapsUrl ?? '',
    Latitude: b.latitude ?? '',
    Longitude: b.longitude ?? '',
    'Scraped At': b.scrapedAt,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, 20),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Businesses');

  // Get search info for filename
  const { data: searchData } = await supabase
    .from('searches')
    .select('category, location')
    .eq('id', searchId)
    .single();

  const dateStr = new Date().toISOString().split('T')[0];
  const cat = (searchData?.category ?? 'export').replace(/\s+/g, '-').toLowerCase();
  const loc = (searchData?.location ?? 'location').replace(/\s+/g, '-').toLowerCase();

  if (format === 'csv') {
    const csvStr = XLSX.utils.sheet_to_csv(ws);
    return {
      buffer: Buffer.from(csvStr, 'utf-8'),
      filename: `${cat}-${loc}-${dateStr}.csv`,
      contentType: 'text/csv',
    };
  }

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return {
    buffer: Buffer.from(xlsxBuffer),
    filename: `${cat}-${loc}-${dateStr}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
