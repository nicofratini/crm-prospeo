import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verify, decode } from "npm:djwt@3.0.0";
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseServiceClient } from "../utils/supabaseServiceClient.ts";

// Validate JWT token and extract user ID using the template's AUTH_SECRET
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
    // Create a TextEncoder for the secret key
    const key = new TextEncoder().encode(secret);

    // Verify the token signature and expiration
    const payload = await verify(token, key, { algorithms: ["HS256"] });

    // Extract the user ID from the payload
    // Adjust the claim name based on how the template creates JWTs
    const userId = payload?.sub || payload?.id;

    if (typeof userId !== 'string' || !userId) {
      console.error("User ID not found in JWT payload:", payload);
      throw new Error("Invalid token payload");
    }

    console.log("Token validated successfully for user:", userId);
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

  try {
    const authHeader = req.headers.get('Authorization');
    const userId = await getUserIdFromToken(authHeader);

    // Use service role client to bypass RLS
    const supabase = getSupabaseServiceClient();

    // Get user data from public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        avatar_url,
        onboarding_completed,
        created_at,
        updated_at,
        last_login
      `)
      .eq('id', userId)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ profile: null, message: 'User not found' }), 
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      throw userError;
    }

    // Get AI agent configuration if it exists
    const { data: aiAgent, error: aiAgentError } = await supabase
      .from('ai_agents')
      .select(`
        id,
        agent_name,
        elevenlabs_voice_id,
        system_prompt,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (aiAgentError && aiAgentError.code !== 'PGRST116') {
      throw aiAgentError;
    }

    // Return combined user data
    return new Response(
      JSON.stringify({
        profile: {
          ...userData,
          ai_agent: aiAgent || null
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function error:', error.message);
    
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