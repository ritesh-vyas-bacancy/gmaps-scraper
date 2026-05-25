# GMaps Scraper — Business Intelligence Platform

A production-ready Google Maps scraping application built as a monorepo. Users select a business category, enter a location, and receive scraped business leads (name, phone, rating, address, website, coordinates) in a professional dashboard — with 3-day intelligent caching, Excel/CSV export, and a Playwright-based anti-detection scraper.

---

## Architecture Overview

```
gmaps-scraper/
├── apps/
│   ├── frontend/          Next.js 15 (App Router, TypeScript, Tailwind, ShadCN, TanStack Table)
│   └── scraper-backend/   Express.js API + Playwright scraper (TypeScript)
├── packages/
│   └── shared-types/      Shared TypeScript interfaces & constants
└── database/
    ├── schema.sql          Supabase PostgreSQL schema
    └── seed.sql            Sample data for local dev
```

**Frontend → Vercel · Backend → Railway/Render · Database → Supabase**

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| Supabase account | free tier works |

### 1. Clone & install

```bash
git clone https://github.com/your-org/gmaps-scraper.git
cd gmaps-scraper
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** → run `database/schema.sql`
3. (Optional) run `database/seed.sql` for sample data
4. Copy your project URL and keys from **Settings → API**

### 3. Configure environment variables

**Backend** (`apps/scraper-backend/.env`):
```env
NODE_ENV=development
PORT=4000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=http://localhost:3000
PLAYWRIGHT_TIMEOUT=60000
PLAYWRIGHT_HEADLESS=true
MAX_RESULTS_PER_SEARCH=100
CACHE_TTL_DAYS=3
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
```

**Frontend** (`apps/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install Playwright browsers

```bash
cd apps/scraper-backend
npx playwright install chromium
```

### 5. Run in development

```bash
# Root — runs both frontend and backend concurrently
npm run dev

# Or individually
npm run dev:frontend   # http://localhost:3000
npm run dev:backend    # http://localhost:4000
```

---

## API Reference

### `POST /api/search`

Trigger a search (uses cache or scrapes fresh).

```json
{
  "category": "Hotels",
  "location": "Ahmedabad",
  "forceRefresh": false
}
```

Response:
```json
{
  "searchId": "uuid",
  "searchKey": "hotels-ahmedabad",
  "fromCache": true,
  "totalResults": 87,
  "businesses": [...]
}
```

### `GET /api/results/:searchId`

Paginated results for an existing search.

Query params: `page`, `pageSize`, `sortBy`, `sortOrder`, `search`

### `POST /api/export/:searchId`

Download Excel or CSV.

```json
{
  "format": "xlsx",
  "selectedIds": ["uuid1", "uuid2"]  // optional — omit for all
}
```

Returns a binary file download.

### `GET /health`

Health check endpoint used by Railway/Render.

---

## Cache Logic

```
Search received
    │
    ▼
Build search_key (e.g. "hotels-ahmedabad")
    │
    ▼
Check Supabase for existing search
    │
    ├─ NOT found  ────────────────────────────────────► Scrape
    ├─ FOUND, cache_expiry_at < now()  ──────────────► Scrape
    ├─ FOUND, forceRefresh = true  ──────────────────► Scrape
    └─ FOUND, fresh, no force  ──────────────────────► Return cached

Scrape flow:
  Playwright → Google Maps → scroll → extract → save to Supabase → return
```

Cache TTL is configurable via `CACHE_TTL_DAYS` (default: 3 days).

---

## Scraper Details

- **Engine**: Playwright Chromium (headless, configurable)
- **Anti-detection**: random user agents, viewport randomisation, human-like typing delays, patched `navigator.webdriver`
- **Scrolling**: smooth incremental scroll with stop-detection ("You've reached the end")
- **Resilience**: per-business try/catch — one failed record never crashes the batch
- **Limits**: configurable `MAX_RESULTS_PER_SEARCH` (default 100)

### Known limitations

- Google Maps DOM changes periodically. If selectors break, update `SELECTORS` in `scraper.service.ts`.
- Working hours require clicking into each business detail panel — this is left as a v2 enhancement.
- Phone numbers are not always visible in the list view; clicking each card is needed for 100% coverage.
- Running on residential IPs gives the best results. Datacenter IPs (Railway) may get CAPTCHAs over time.

---

## Deployment

### Backend → Railway

1. Connect your GitHub repo to Railway
2. Set root directory to `apps/scraper-backend`
3. Add environment variables in Railway dashboard
4. Railway auto-detects `railway.toml` for build/start commands
5. After deploy, copy the public URL (e.g. `https://your-app.railway.app`)

```toml
# apps/scraper-backend/railway.toml
[build]
buildCommand = "npm run build"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/health"
```

**Important**: add the Playwright Chromium install step:
In Railway → Settings → Build Command:
```
npm run build && npx playwright install chromium --with-deps
```

### Frontend → Vercel

1. Import the repo at [vercel.com](https://vercel.com)
2. Set root directory to `apps/frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` → your Railway backend URL
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Alternative: Render (backend)

Use a **Web Service** with:
- Build command: `npm install && npm run build && npx playwright install chromium --with-deps`
- Start command: `node dist/index.js`
- Health check path: `/health`

---

## Project Structure (detailed)

```
apps/scraper-backend/src/
├── index.ts                  Express app entry — middleware, routes, error handling
├── lib/
│   ├── supabase.ts           Supabase client (service-role)
│   ├── logger.ts             Lightweight structured logger
│   ├── helpers.ts            Pure helpers: search key, parsers, coordinate extraction
│   └── userAgents.ts         User-agent & viewport rotation lists
├── middleware/
│   ├── rateLimiter.ts        Global + per-search rate limiting
│   └── errorHandler.ts       Centralised error response formatting
├── routes/
│   ├── search.ts             POST /api/search
│   ├── results.ts            GET  /api/results/:id
│   └── export.ts             POST /api/export/:id
└── services/
    ├── scraper.service.ts    Playwright scraper — browser lifecycle, extraction
    ├── cache.service.ts      Cache read/write against Supabase searches table
    ├── business.service.ts   Bulk insert/query businesses
    ├── search.service.ts     Orchestrates cache check → scrape → persist
    └── export.service.ts     SheetJS XLSX/CSV generation

apps/frontend/src/
├── app/
│   ├── layout.tsx            Root layout with ThemeProvider + Toaster
│   ├── page.tsx              Homepage
│   └── globals.css           Tailwind + CSS variables (dark/light theme)
├── components/
│   ├── layout/Header.tsx     Sticky header with dark-mode toggle
│   ├── providers/            ThemeProvider wrapper
│   ├── search/
│   │   ├── SearchSection.tsx Top-level state container
│   │   ├── SearchForm.tsx    Category autocomplete + location + force-refresh toggle
│   │   └── LoadingOverlay.tsx Animated loading card with rotating messages
│   ├── results/
│   │   ├── ResultsSection.tsx Summary stats + table + export
│   │   ├── BusinessTable.tsx  TanStack Table — sort, filter, paginate, select
│   │   ├── ExportMenu.tsx    Dropdown: XLSX/CSV all or selected rows
│   │   └── TableSkeleton.tsx Loading skeleton for table
│   └── ui/                   ShadCN-style primitives (Button, Card, Badge, etc.)
├── lib/
│   ├── api.ts                Typed API client (fetch wrappers)
│   └── utils.ts              cn(), formatNumber, truncateUrl, downloadBlob
```

---

## Future Roadmap

| Feature | Notes |
|---------|-------|
| Google Places API integration | Higher reliability, rate-limited but stable |
| Proxy rotation | Brightdata / Oxylabs for datacenter IP resilience |
| Working hours extraction | Click into each business detail panel |
| Queue system | BullMQ for async scraping jobs |
| Multi-user auth | Supabase Auth + per-user search history |
| Scheduled scraping | Cron jobs to refresh popular searches |
| AI lead scoring | Claude API to rank leads by quality signals |
| SaaS subscription | Stripe integration, usage limits per plan |

---

## Security Notes

- Supabase `service_role` key is **never** exposed to the frontend
- Row-Level Security (RLS) is enabled — anon key cannot read data directly
- Rate limiting on all routes (global + per-search)
- CORS restricted to `FRONTEND_URL` (+ Vercel preview URLs)
- Helmet.js for HTTP security headers
- All user inputs validated with Zod before use

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Run `npm run type-check` in the repo root before opening a PR
4. Keep scraper selectors in the `SELECTORS` constant — never hardcode them inline

---

## License

MIT
