import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Ensure this runs only once per function invocation context if possible
let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns a Supabase client initialized with the Service Role Key.
 * Intended for use ONLY within Supabase Edge Functions.
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from function's environment variables.
 */
export const getSupabaseServiceClient = (): SupabaseClient => {
  if (!supabaseInstance) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Supabase URL or Service Role Key environment variable is missing.");
      throw new Error("Supabase client configuration error in Edge Function.");
    }
    
    console.log("Initializing Supabase Service Client for Edge Function...");
    supabaseInstance = createClient(supabaseUrl, serviceKey, {
      auth: {
        // Important for server-side/service role client
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseInstance;
};