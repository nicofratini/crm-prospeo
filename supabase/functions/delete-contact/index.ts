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

  if (req.method !== 'DELETE') {
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

    // Check if contact has associated calls
    const { data: calls, error: callsError } = await supabase
      .from('call_history')
      .select('id', { count: 'exact' })
      .eq('contact_id', contactId)
      .limit(1);

    if (callsError) {
      console.error('Error checking associated calls:', callsError);
      throw new Error('Failed to check associated calls');
    }

    // If there are associated calls, prevent deletion
    if (calls && calls.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot delete contact with associated call history',
          details: 'Please archive the contact instead of deleting'
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete the contact, ensuring ownership
    const { error: dbError, count } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      throw new Error('Failed to delete contact');
    }

    // Check if any row was actually deleted
    if (count === 0) {
      return new Response(
        JSON.stringify({ error: 'Contact not found or delete forbidden' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return 204 No Content for successful deletion
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });

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