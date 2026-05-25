'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Loader2, RefreshCw, MapPin, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DEFAULT_CATEGORIES } from '@gmaps-scraper/shared-types';

const schema = z.object({
  category: z.string().min(1, 'Category is required').max(100),
  location: z.string().min(1, 'Location is required').max(200),
  forceRefresh: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface SearchFormProps {
  onSearch: (category: string, location: string, forceRefresh: boolean) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [categoryQuery, setCategoryQuery] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: '', location: '', forceRefresh: false },
  });

  const forceRefresh = watch('forceRefresh');

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setShowCategorySuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredCategories = DEFAULT_CATEGORIES.filter((c) =>
    c.label.toLowerCase().includes(categoryQuery.toLowerCase()),
  );

  function onSubmit(values: FormValues) {
    onSearch(values.category, values.location, values.forceRefresh);
  }

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Category */}
            <div className="space-y-2" ref={categoryRef}>
              <Label htmlFor="category" className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                Business Category
              </Label>
              <div className="relative">
                <Input
                  id="category"
                  placeholder="e.g. Hotels, Hospitals, Restaurants…"
                  autoComplete="off"
                  {...register('category')}
                  value={categoryQuery || watch('category')}
                  onChange={(e) => {
                    setCategoryQuery(e.target.value);
                    setValue('category', e.target.value);
                    setShowCategorySuggestions(true);
                  }}
                  onFocus={() => setShowCategorySuggestions(true)}
                  className={cn(errors.category && 'border-destructive')}
                />
                {showCategorySuggestions && filteredCategories.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-md">
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setValue('category', cat.label);
                          setCategoryQuery(cat.label);
                          setShowCategorySuggestions(false);
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category.message}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g. Ahmedabad, Mumbai, New York…"
                {...register('location')}
                className={cn(errors.location && 'border-destructive')}
              />
              {errors.location && (
                <p className="text-xs text-destructive">{errors.location.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Force refresh toggle */}
            <Controller
              control={control}
              name="forceRefresh"
              render={({ field }) => (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
                  <Switch
                    id="forceRefresh"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <div>
                    <Label htmlFor="forceRefresh" className="text-sm cursor-pointer font-medium flex items-center gap-1.5">
                      <RefreshCw className={cn('w-3.5 h-3.5', forceRefresh && 'text-blue-500')} />
                      Force fresh scrape
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {forceRefresh
                        ? 'Will bypass cache and scrape fresh data'
                        : 'Using cached data if available (≤3 days)'}
                    </p>
                  </div>
                </div>
              )}
            />

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full sm:w-auto min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search Maps
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
