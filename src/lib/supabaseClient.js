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
          const value = localStorage.getItem(key);
          console.log('[Supabase Storage] Reading:', key, value ? '(found)' : '(not found)');
          return value;
        } catch (error) {
          console.error('[Supabase Storage] Error reading from localStorage:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          console.log('[Supabase Storage] Writing:', key);
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('[Supabase Storage] Error writing to localStorage:', error);
        }
      },
      removeItem: (key) => {
        try {
          console.log('[Supabase Storage] Removing:', key);
          localStorage.removeItem(key);
        } catch (error) {
          console.error('[Supabase Storage] Error removing from localStorage:', error);
        }
      }
    }
  }
});

// Set up auth state change listener with enhanced logging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[Supabase Auth] Event:', event);
  console.log('[Supabase Auth] Session:', session ? {
    user: session.user.email,
    expires_at: new Date(session.expires_at * 1000).toISOString(),
    refresh_token: session.refresh_token ? '(present)' : '(missing)'
  } : 'null');
  
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    console.log('[Supabase Auth] Clearing session data');
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.refreshToken');
  }
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('[Supabase Auth] Token refreshed successfully');
  }

  if (event === 'SIGNED_IN') {
    console.log('[Supabase Auth] User signed in successfully');
  }
});

// Export a function to test the connection
export async function testSupabaseConnection() {
  try {
    console.log('[Supabase] Testing connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    console.log('[Supabase] Connection test successful');
    return true;
  } catch (error) {
    console.error('[Supabase] Connection test failed:', error.message);
    return false;
  }
}