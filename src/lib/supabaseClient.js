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
    detectSessionInUrl: true,
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.error('[Supabase Storage] Error reading from localStorage:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('[Supabase Storage] Error writing to localStorage:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('[Supabase Storage] Error removing from localStorage:', error);
        }
      }
    }
  }
});

// Set up auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[Supabase Auth] Auth state changed:', event, session?.user?.email);
  
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    // Clear any cached data
    localStorage.removeItem('supabase.auth.token');
    console.log('[Supabase Auth] Session cleared due to:', event);
  }
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('[Supabase Auth] Token refreshed successfully');
  }
});

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