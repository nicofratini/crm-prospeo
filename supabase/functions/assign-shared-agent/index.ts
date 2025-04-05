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

// Schema for request body
const assignAgentSchema = z.object({
  agentId: z.string().uuid("Invalid agent ID format")
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Validate JWT and get user ID
    const userId = await getUserIdFromToken(req.headers.get('Authorization'));

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const validationResult = assignAgentSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          details: validationResult.error.flatten()
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { agentId } = validationResult.data;

    // Get Supabase client
    const supabase = getSupabaseServiceClient();

    // Verify agent exists and is shared (or user is owner)
    const { data: agentCheck, error: checkError } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('id', agentId)
      .or(`is_shared.eq.true,owner_user_id.eq.${userId}`)
      .maybeSingle();

    if (checkError) {
      console.error('Database check error:', checkError);
      throw new Error('Failed to verify agent access');
    }

    if (!agentCheck) {
      return new Response(
        JSON.stringify({ error: 'Agent not found or not available for assignment' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Call the assign_agent_to_user function
    const { error: assignError } = await supabase.rpc(
      'assign_agent_to_user',
      { 
        p_user_id: userId,
        p_agent_id: agentId
      }
    );

    if (assignError) {
      console.error('Assignment error:', assignError);
      throw new Error('Failed to assign agent');
    }

    // Get the updated assignment details
    const { data: assignment, error: getError } = await supabase
      .from('user_assigned_agents')
      .select(`
        assigned_at,
        agent:ai_agents(
          id,
          agent_name,
          description,
          elevenlabs_voice_id,
          is_shared,
          owner:users!ai_agents_owner_user_id_fkey(
            email
          )
        )
      `)
      .eq('user_id', userId)
      .single();

    if (getError) {
      console.error('Error fetching assignment details:', getError);
      // Don't fail the request, assignment was successful
    }

    return new Response(
      JSON.stringify({
        message: 'Agent assigned successfully',
        assignment: assignment || null
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