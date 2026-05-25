import { createClient } from '@supabase/supabase-js';

// Polyfill WebSocket for Node.js < 22 (required by Supabase realtime)
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebSocket } = require('ws') as { WebSocket: typeof globalThis.WebSocket };
  globalThis.WebSocket = WebSocket;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
