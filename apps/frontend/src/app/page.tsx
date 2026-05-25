import { Header } from '@/components/layout/Header';
import { SearchSection } from '@/components/search/SearchSection';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-4 py-1.5 text-sm text-blue-700 dark:text-blue-300 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            Powered by Playwright · Real-time Google Maps data
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-50 mb-3 tracking-tight">
            Business Intelligence
            <span className="block text-blue-600 dark:text-blue-400">Scraper</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Extract business leads from Google Maps — names, phones, ratings, addresses, and more.
            Results cached for 3 days, exportable to Excel or CSV.
          </p>
        </div>
        <SearchSection />
      </main>
    </div>
  );
}
