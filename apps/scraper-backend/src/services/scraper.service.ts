import { chromium, Browser, BrowserContext, Page } from 'playwright';
import type { Business, ScraperResult } from '../types/shared.js';
import { randomDelay } from '../lib/helpers.js';
import { getRandomUserAgent, getRandomViewport } from '../lib/userAgents.js';
import { parseRating, parseReviewCount, extractCoordinates, truncate } from '../lib/helpers.js';
import { logger } from '../lib/logger.js';

const MAX_RESULTS = parseInt(process.env.MAX_RESULTS_PER_SEARCH ?? '100', 10);
const PLAYWRIGHT_TIMEOUT = parseInt(process.env.PLAYWRIGHT_TIMEOUT ?? '60000', 10);
const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== 'false';

export async function runScraper(
  category: string,
  location: string,
): Promise<ScraperResult> {
  const startTime = Date.now();
  const query = `${category} in ${location}`;
  logger.info(`Starting scrape`, { query, maxResults: MAX_RESULTS });

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({
      headless: HEADLESS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--lang=en-US,en',
      ],
    });

    const viewport = getRandomViewport();
    context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
      javaScriptEnabled: true,
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // @ts-ignore
      window.chrome = { runtime: {} };
    });

    const page = await context.newPage();
    page.setDefaultTimeout(PLAYWRIGHT_TIMEOUT);

    const businesses = await scrapeGoogleMaps(page, query, category);

    return {
      businesses,
      totalFound: businesses.length,
      scrapedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  } finally {
    await context?.close();
    await browser?.close();
    logger.info(`Scraper finished`, { duration: Date.now() - startTime });
  }
}

async function scrapeGoogleMaps(
  page: Page,
  query: string,
  category: string,
): Promise<Business[]> {
  // Navigate directly to search URL — skips the search box interaction entirely,
  // which is the most common point of bot detection and selector breakage.
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  logger.info(`Navigating to: ${searchUrl}`);

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: PLAYWRIGHT_TIMEOUT });
  await randomDelay(2000, 4000);

  // Handle cookie/consent dialog (common in EU/India region servers)
  try {
    const consentBtn = page.locator(
      'button:has-text("Accept all"), button:has-text("I agree"), button:has-text("Reject all"), form[action*="consent"] button'
    ).first();
    if (await consentBtn.isVisible({ timeout: 5000 })) {
      await consentBtn.click();
      await randomDelay(1000, 2000);
    }
  } catch {
    // No consent dialog — proceed
  }

  // Wait for results feed
  try {
    await page.waitForSelector('div[role="feed"]', { timeout: 30000 });
  } catch {
    // May have navigated to a single business page — return empty
    logger.warn('Results feed not found — may be a single result or blocked page');
    const pageTitle = await page.title().catch(() => '');
    logger.warn(`Page title was: ${pageTitle}`);
    return [];
  }

  await randomDelay(1500, 3000);

  return await scrollAndExtract(page, category);
}

async function scrollAndExtract(page: Page, category: string): Promise<Business[]> {
  const businesses: Business[] = [];
  const seenNames = new Set<string>();
  let noNewResultsCount = 0;

  logger.info('Starting scroll-and-extract loop');

  for (let attempt = 0; attempt < 50 && businesses.length < MAX_RESULTS; attempt++) {
    const extracted = await extractVisibleResults(page, category);

    let newCount = 0;
    for (const biz of extracted) {
      if (!seenNames.has(biz.businessName) && businesses.length < MAX_RESULTS) {
        seenNames.add(biz.businessName);
        businesses.push(biz);
        newCount++;
      }
    }

    logger.debug(`Scroll ${attempt + 1}: visible=${extracted.length}, new=${newCount}, total=${businesses.length}`);

    if (newCount === 0) {
      noNewResultsCount++;
      if (noNewResultsCount >= 5) {
        logger.info('No new results after 5 scrolls — done');
        break;
      }
    } else {
      noNewResultsCount = 0;
    }

    const endOfList = await page
      .locator('span:has-text("You\'ve reached the end"), p:has-text("end of the list")')
      .isVisible()
      .catch(() => false);
    if (endOfList) {
      logger.info('End-of-list marker found');
      break;
    }

    await smoothScroll(page);
    await randomDelay(800, 2000);
  }

  logger.info(`Total extracted: ${businesses.length}`);
  return businesses;
}

async function smoothScroll(page: Page): Promise<void> {
  await page.evaluate(`
    (function() {
      var feed = document.querySelector('div[role="feed"]');
      if (feed) {
        feed.scrollBy({ top: 300 + Math.random() * 400, behavior: 'smooth' });
      }
    })();
  `);
}

async function extractVisibleResults(page: Page, category: string): Promise<Business[]> {
  const businesses: Business[] = [];
  const items = await page.locator('div[role="feed"] > div').all();

  for (const item of items) {
    try {
      const hasName = await item.locator('h3, [data-value]').count().catch(() => 0);
      if (hasName === 0) continue;

      const biz = await extractBusinessFromItem(item, category);
      if (biz) businesses.push(biz);
    } catch {
      // Skip individual failures silently
    }
  }

  return businesses;
}

async function extractBusinessFromItem(
  item: ReturnType<Page['locator']>,
  category: string,
): Promise<Business | null> {
  try {
    // Business name
    let businessName = '';
    for (const sel of ['h3.fontHeadlineSmall', 'div.fontHeadlineSmall', 'h3', '[data-value]']) {
      try {
        const el = item.locator(sel).first();
        if (await el.count() > 0) {
          businessName = (await el.textContent()) ?? '';
          if (businessName.trim()) break;
        }
      } catch { /* try next */ }
    }
    if (!businessName.trim()) return null;
    businessName = businessName.trim();

    // Rating
    let ratingRaw: string | null = null;
    for (const sel of ['span.MW4etd', 'span[aria-hidden="true"]']) {
      try {
        const el = item.locator(sel).first();
        if (await el.count() > 0) {
          ratingRaw = await el.getAttribute('aria-label') ?? await el.textContent();
          if (ratingRaw?.match(/\d/)) break;
        }
      } catch { /* skip */ }
    }

    // Review count
    let reviewRaw: string | null = null;
    try {
      const el = item.locator('span.UY7F9').first();
      if (await el.count() > 0) reviewRaw = await el.textContent();
    } catch { /* skip */ }

    // Address
    let address: string | null = null;
    try {
      const spans = item.locator('div.W4Efsd span');
      const count = await spans.count();
      for (let i = count - 1; i >= 0; i--) {
        const t = await spans.nth(i).textContent();
        if (t && t.trim().length > 5 && !t.includes('·')) {
          address = t.trim();
          break;
        }
      }
    } catch { /* skip */ }

    // Website link
    let website: string | null = null;
    try {
      const el = item.locator('a[data-item-id="authority"]').first();
      if (await el.count() > 0) website = await el.getAttribute('href');
    } catch { /* skip */ }

    // Google Maps URL + coords
    let googleMapsUrl: string | null = null;
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const el = item.locator('a[href*="maps.google"], a[href*="/maps/place"]').first();
      if (await el.count() > 0) {
        googleMapsUrl = await el.getAttribute('href');
        if (googleMapsUrl) {
          const coords = extractCoordinates(googleMapsUrl);
          lat = coords.lat;
          lng = coords.lng;
        }
      }
    } catch { /* skip */ }

    // Thumbnail
    let thumbnailImage: string | null = null;
    try {
      const el = item.locator('img').first();
      if (await el.count() > 0) {
        thumbnailImage = await el.getAttribute('src');
        if (thumbnailImage?.startsWith('data:')) thumbnailImage = null;
      }
    } catch { /* skip */ }

    return {
      businessName,
      businessCategory: category,
      rating: parseRating(ratingRaw),
      totalReviews: parseReviewCount(reviewRaw),
      address: truncate(address),
      phoneNumber: null,
      website: truncate(website),
      googleMapsUrl: truncate(googleMapsUrl, 1000),
      latitude: lat,
      longitude: lng,
      workingHours: null,
      thumbnailImage: truncate(thumbnailImage, 500),
      scrapedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.debug('Failed to extract business', { error: String(err) });
    return null;
  }
}
