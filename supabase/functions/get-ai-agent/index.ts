import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verify } from "npm:djwt@3.0.0";
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow GET requests
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

    const supabase = getSupabaseServiceClient();

    // Get the agent configuration for the user
    const { data: agent, error: dbError } = await supabase
      .from('ai_agents')
      .select(`
        id,
        agent_name,
        elevenlabs_voice_id,
        elevenlabs_agent_id,
        system_prompt,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (dbError) {
      console.error('Database query error:', dbError);
      throw new Error('Failed to fetch agent configuration');
    }

    // Return null if no agent configuration exists
    if (!agent) {
      return new Response(
        JSON.stringify({ agent: null }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ agent }),
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