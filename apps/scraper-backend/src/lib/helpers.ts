/** Sleep for a random duration between min and max ms */
export function randomDelay(minMs = 500, maxMs = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Normalise a search key: lowercase, trim, collapse spaces, strip special chars */
export function buildSearchKey(category: string, location: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
  return `${normalize(category)}-${normalize(location)}`;
}

/** Parse a rating string like "4.5" → 4.5, or null if unparseable */
export function parseRating(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = parseFloat(raw.replace(',', '.'));
  return isNaN(n) ? null : n;
}

/** Parse a review count string like "1,234" → 1234, or null */
export function parseReviewCount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9]/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

/** Extract coordinates from a Google Maps URL */
export function extractCoordinates(url: string): { lat: number | null; lng: number | null } {
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) return { lat: null, lng: null };
  return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
}

/** Truncate a string to max length */
export function truncate(s: string | null | undefined, max = 500): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}
