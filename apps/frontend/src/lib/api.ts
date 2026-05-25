import type {
  SearchRequest,
  SearchResponse,
  PaginatedResponse,
  Business,
  PaginationParams,
  ExportFormat,
} from '@gmaps-scraper/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      errorMsg = body.message ?? errorMsg;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export async function searchBusinesses(req: SearchRequest): Promise<SearchResponse> {
  return apiFetch<SearchResponse>('/api/search', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function getResults(
  searchId: string,
  params: Partial<PaginationParams> = {},
): Promise<PaginatedResponse<Business>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
  if (params.search) qs.set('search', params.search);

  return apiFetch<PaginatedResponse<Business>>(`/api/results/${searchId}?${qs.toString()}`);
}

export async function exportResults(
  searchId: string,
  format: ExportFormat,
  selectedIds?: string[],
): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/export/${searchId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, selectedIds }),
  });

  if (!res.ok) {
    let errorMsg = `Export failed: HTTP ${res.status}`;
    try {
      const body = await res.json();
      errorMsg = body.message ?? errorMsg;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  return res.blob();
}
