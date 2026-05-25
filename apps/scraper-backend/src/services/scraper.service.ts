import { chromium, Browser, BrowserContext, Page } from 'playwright';
import type { Business, ScraperResult } from '@gmaps-scraper/shared-types';
import { randomDelay } from '../lib/helpers.js';
import { getRandomUserAgent, getRandomViewport } from '../lib/userAgents.js';
import { parseRating, parseReviewCount, extractCoordinates, truncate } from '../lib/helpers.js';
import { logger } from '../lib/logger.js';

const MAX_RESULTS = parseInt(process.env.MAX_RESULTS_PER_SEARCH ?? '100', 10);
const PLAYWRIGHT_TIMEOUT = parseInt(process.env.PLAYWRIGHT_TIMEOUT ?? '60000', 10);
const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== 'false';

// Selectors with fallbacks — Google Maps changes its DOM periodically
const SELECTORS = {
  searchInput: 'input#searchboxinput',
  searchButton: 'button#searchbox-searchbutton',
  resultsPanel: 'div[role="feed"]',
  resultItem: 'div[role="feed"] > div',
  // Within each result card
  name: ['h3.fontHeadlineSmall', 'div.fontHeadlineSmall', '[data-value]'],
  rating: ['span.MW4etd', 'span[aria-hidden="true"]'],
  reviews: ['span.UY7F9', 'span[aria-label*="review"]'],
  address: ['div.W4Efsd span:last-child', 'div.Io6YTe'],
  phone: ['span[data-dtype="d3ph"]', 'button[data-item-id*="phone"] div'],
  website: ['a[data-item-id="authority"]', 'a[href*="http"]:not([href*="google"])'],
  hours: ['div[aria-label*="Hours"]', 'div.t39EBf'],
};

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
      // Mask automation signals
      javaScriptEnabled: true,
    });

    // Patch navigator.webdriver to hide Playwright
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
  // Navigate to Google Maps
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded' });
  await randomDelay(1000, 2500);

  // Handle cookie consent if it appears
  try {
    const acceptBtn = page.locator('button:has-text("Accept all"), button:has-text("Reject all"), form[action*="consent"] button').first();
    if (await acceptBtn.isVisible({ timeout: 4000 })) {
      await acceptBtn.click();
      await randomDelay(500, 1000);
    }
  } catch {
    // No consent dialog — proceed
  }

  // Type in search box with human-like typing
  const searchBox = page.locator(SELECTORS.searchInput);
  await searchBox.waitFor({ state: 'visible', timeout: 15000 });
  await searchBox.click();
  await randomDelay(300, 700);

  // Type character by character to mimic human input
  for (const char of query) {
    await page.keyboard.type(char, { delay: Math.random() * 80 + 30 });
  }

  await randomDelay(500, 1000);
  await page.keyboard.press('Enter');

  // Wait for results feed
  try {
    await page.waitForSelector(SELECTORS.resultsPanel, { timeout: 20000 });
  } catch {
    // May be showing a direct result — fall back
    logger.warn('Results panel not found, page may show direct result');
    return [];
  }

  await randomDelay(1500, 3000);

  // Scroll to load all results
  const allBusinesses = await scrollAndExtract(page, query, category);
  return allBusinesses;
}

async function scrollAndExtract(
  page: Page,
  query: string,
  category: string,
): Promise<Business[]> {
  const businesses: Business[] = [];
  const seenNames = new Set<string>();
  let noNewResultsCount = 0;
  const MAX_NO_NEW = 5;

  logger.info('Starting scroll-and-extract loop');

  for (let attempt = 0; attempt < 50 && businesses.length < MAX_RESULTS; attempt++) {
    // Extract currently visible results
    const extracted = await extractVisibleResults(page, category);

    let newCount = 0;
    for (const biz of extracted) {
      if (!seenNames.has(biz.businessName) && businesses.length < MAX_RESULTS) {
        seenNames.add(biz.businessName);
        businesses.push(biz);
        newCount++;
      }
    }

    logger.debug(`Scroll attempt ${attempt + 1}: extracted ${extracted.length}, new ${newCount}, total ${businesses.length}`);

    if (newCount === 0) {
      noNewResultsCount++;
      if (noNewResultsCount >= MAX_NO_NEW) {
        logger.info('No new results after several scrolls — done');
        break;
      }
    } else {
      noNewResultsCount = 0;
    }

    // Check if "You've reached the end of the list" message is present
    const endMessage = await page.locator('span:has-text("You\'ve reached the end")').isVisible().catch(() => false);
    if (endMessage) {
      logger.info('End of results reached');
      break;
    }

    // Smooth human-like scroll
    await smoothScroll(page);
    await randomDelay(800, 2000);
  }

  logger.info(`Total businesses extracted: ${businesses.length}`);
  return businesses;
}

async function smoothScroll(page: Page): Promise<void> {
  // Scroll inside the results feed panel; runs in browser context
  await page.evaluate(`
    (function() {
      var feed = document.querySelector('div[role="feed"]');
      if (feed) {
        var amount = 300 + Math.random() * 400;
        feed.scrollBy({ top: amount, behavior: 'smooth' });
      }
    })();
  `);
}

async function extractVisibleResults(page: Page, category: string): Promise<Business[]> {
  const businesses: Business[] = [];

  // Get all result list items
  const items = await page.locator('div[role="feed"] > div').all();

  for (const item of items) {
    try {
      // Skip spacer/ad divs without meaningful content
      const hasName = await item.locator('h3, [data-value]').count().catch(() => 0);
      if (hasName === 0) continue;

      const biz = await extractBusinessFromItem(item, category, page);
      if (biz) {
        businesses.push(biz);
      }
    } catch {
      // Skip individual failures silently
    }
  }

  return businesses;
}

async function extractBusinessFromItem(
  item: ReturnType<Page['locator']>,
  category: string,
  page: Page,
): Promise<Business | null> {
  try {
    // Business name — try multiple selectors
    let businessName = '';
    for (const sel of SELECTORS.name) {
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
    for (const sel of SELECTORS.rating) {
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
      const reviewEl = item.locator('span.UY7F9').first();
      if (await reviewEl.count() > 0) {
        reviewRaw = await reviewEl.textContent();
      }
    } catch { /* skip */ }

    // Address — look for text after the category/type separator
    let address: string | null = null;
    try {
      const spans = item.locator('div.W4Efsd span');
      const count = await spans.count();
      // Address is usually the last meaningful text block
      for (let i = count - 1; i >= 0; i--) {
        const t = await spans.nth(i).textContent();
        if (t && t.trim().length > 5 && !t.includes('·')) {
          address = t.trim();
          break;
        }
      }
    } catch { /* skip */ }

    // Phone — not usually visible in list view; populated when clicking
    const phoneNumber: string | null = null;

    // Website link
    let website: string | null = null;
    try {
      const webEl = item.locator('a[data-item-id="authority"]').first();
      if (await webEl.count() > 0) {
        website = await webEl.getAttribute('href');
      }
    } catch { /* skip */ }

    // Google Maps URL
    let googleMapsUrl: string | null = null;
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const linkEl = item.locator('a[href*="maps.google"], a[href*="/maps/place"]').first();
      if (await linkEl.count() > 0) {
        googleMapsUrl = await linkEl.getAttribute('href');
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
      const imgEl = item.locator('img').first();
      if (await imgEl.count() > 0) {
        thumbnailImage = await imgEl.getAttribute('src');
        if (thumbnailImage?.startsWith('data:')) thumbnailImage = null;
      }
    } catch { /* skip */ }

    return {
      businessName,
      businessCategory: category,
      rating: parseRating(ratingRaw),
      totalReviews: parseReviewCount(reviewRaw),
      address: truncate(address),
      phoneNumber,
      website: truncate(website),
      googleMapsUrl: truncate(googleMapsUrl, 1000),
      latitude: lat,
      longitude: lng,
      workingHours: null, // Requires clicking into detail — left for v2
      thumbnailImage: truncate(thumbnailImage, 500),
      scrapedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.debug('Failed to extract business', { error: String(err) });
    return null;
  }
}
