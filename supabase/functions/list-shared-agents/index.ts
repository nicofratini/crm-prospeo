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
    // Validate JWT and get user ID
    const userId = await getUserIdFromToken(req.headers.get('Authorization'));

    // Get Supabase client
    const supabase = getSupabaseServiceClient();

    // Fetch shared agents and any agent currently assigned to the user
    const { data: agents, error: dbError } = await supabase
      .from('ai_agents')
      .select(`
        id,
        agent_name,
        description,
        elevenlabs_voice_id,
        is_shared,
        owner:users!ai_agents_owner_user_id_fkey(
          email
        ),
        assigned:user_assigned_agents!user_assigned_agents_assigned_agent_id_fkey(
          user_id
        )
      `)
      .or(`is_shared.eq.true,id.eq.${
        // Subquery to get the user's currently assigned agent
        supabase
          .from('user_assigned_agents')
          .select('assigned_agent_id')
          .eq('user_id', userId)
          .single()
          .then(result => result.data?.assigned_agent_id || '')
      }`)
      .order('agent_name');

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to fetch shared agents');
    }

    // Process agents to add assignment status
    const processedAgents = agents?.map(agent => ({
      id: agent.id,
      agent_name: agent.agent_name,
      description: agent.description,
      elevenlabs_voice_id: agent.elevenlabs_voice_id,
      is_shared: agent.is_shared,
      owner_email: agent.owner?.email,
      is_assigned: agent.assigned?.some(assignment => assignment.user_id === userId) || false
    })) || [];

    return new Response(
      JSON.stringify({
        agents: processedAgents
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