import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verify } from "npm:djwt@3.0.0";
import { z } from "npm:zod@3.22.4";
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseServiceClient } from "../utils/supabaseServiceClient.ts";

// Validate JWT token and extract user ID
const getUserIdFromToken = async (authHeader: string | null): Promise<string> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error("Missing or invalid Authorization header");
  }
  const token = authHeader.split(' ')[1];
  const secret = Deno.env.get("AUTH_SECRET");

  if (!secret || secret.length < 32) {
    console.error("AUTH_SECRET environment variable is missing or too short.");
    throw new Error("Authentication secret configuration error.");
  }

  try {
    const key = new TextEncoder().encode(secret);
    const payload = await verify(token, key, { algorithms: ["HS256"] });
    const userId = payload?.sub || payload?.id;

    if (typeof userId !== 'string' || !userId) {
      console.error("User ID not found in JWT payload:", payload);
      throw new Error("Invalid token payload");
    }

    return userId;

  } catch (jwtError: any) {
    console.error("JWT validation failed:", jwtError.message);
    if (jwtError.message.toLowerCase().includes('expired')) {
      throw new Error("Token has expired");
    }
    throw new Error("Invalid token signature or structure");
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const userId = await getUserIdFromToken(req.headers.get('Authorization'));

    // Extract contact ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const contactId = pathParts[pathParts.length - 1];

    if (!contactId || !z.string().uuid().safeParse(contactId).success) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing contact ID in URL path' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Get the contact with related property details, ensuring ownership
    const { data: contact, error: dbError } = await supabase
      .from('contacts')
      .select(`
        *,
        interested_property:properties(
          id,
          name,
          address,
          property_type,
          status,
          price
        )
      `)
      .eq('id', contactId)
      .eq('user_id', userId)
      .single();

    if (dbError) {
      console.error('Database query error:', dbError);
      if (dbError.code === 'PGRST116') { // Not found
        return new Response(
          JSON.stringify({ error: 'Contact not found or access denied' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      throw new Error('Failed to fetch contact details');
    }

    if (!contact) {
      return new Response(
        JSON.stringify({ error: 'Contact not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get recent calls for this contact
    const { data: recentCalls, error: callsError } = await supabase
      .from('call_history')
      .select(`
        id,
        call_timestamp,
        duration_seconds,
        status,
        summary
      `)
      .eq('contact_id', contactId)
      .order('call_timestamp', { ascending: false })
      .limit(5);

    if (callsError) {
      console.error('Error fetching recent calls:', callsError);
      // Don't fail the whole request if calls fetch fails
      // Just log and continue without calls data
    }

    return new Response(
      JSON.stringify({
        contact,
        recentCalls: recentCalls || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    const status = error.message.includes('Authorization') || 
                  error.message.includes('token') ? 401 : 500;
                  
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});