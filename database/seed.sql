-- ─── Optional seed data for local development ────────────────────────────────
-- Run after schema.sql to populate a sample search + businesses for UI testing

insert into public.searches (
  id, search_key, category, location, force_refresh,
  total_results, cache_expiry_at
) values (
  '00000000-0000-0000-0000-000000000001',
  'hotels-ahmedabad',
  'Hotels',
  'Ahmedabad',
  false,
  3,
  now() + interval '3 days'
) on conflict (search_key) do nothing;

insert into public.businesses (
  search_id, business_name, business_category, rating, total_reviews,
  address, phone_number, website, google_maps_url, scraped_at
) values
(
  '00000000-0000-0000-0000-000000000001',
  'The Grand Bhagwati',
  'Hotels',
  4.2,
  1842,
  'S.G. Highway, Bodakdev, Ahmedabad, Gujarat 380054',
  '+91 79 4000 4000',
  'https://grandhotels.in',
  'https://maps.google.com/?cid=123',
  now()
),
(
  '00000000-0000-0000-0000-000000000001',
  'Hyatt Regency Ahmedabad',
  'Hotels',
  4.5,
  3210,
  'Ashram Road, Ahmedabad, Gujarat 380009',
  '+91 79 6666 1234',
  'https://hyatt.com',
  'https://maps.google.com/?cid=456',
  now()
),
(
  '00000000-0000-0000-0000-000000000001',
  'Hotel Cama',
  'Hotels',
  3.9,
  567,
  'Khanpur Road, Ahmedabad, Gujarat 380001',
  NULL,
  NULL,
  'https://maps.google.com/?cid=789',
  now()
);
