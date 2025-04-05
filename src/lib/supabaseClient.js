import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log initialization details (but hide sensitive values)
console.log('[Supabase Init] Using URL:', supabaseUrl);
console.log('[Supabase Init] Using Anon Key:', supabaseAnonKey ? '******' : 'MISSING!');

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase Init] CRITICAL: Missing required environment variables!");
  console.error("Make sure these variables are defined in your .env file:");
  console.error("- VITE_SUPABASE_URL");
  console.error("- VITE_SUPABASE_ANON_KEY");
  throw new Error('Missing required Supabase configuration. Check your environment variables.');
}

// Create and configure the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Log successful initialization
console.log('[Supabase Init] Client instance created successfully');

// Export a function to test the connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    console.log('[Supabase] Connection test successful');
    return true;
  } catch (error) {
    console.error('[Supabase] Connection test failed:', error.message);
    return false;
  }
}