import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verify } from "npm:djwt@3.0.0";
import { z } from "npm:zod@3.22.4";
import { corsHeaders } from '../../_shared/cors.ts';
import { getSupabaseServiceClient } from "../../utils/supabaseServiceClient.ts";
import { 
  createElevenLabsConvaiAgent, 
  updateElevenLabsConvaiAgent,
  deleteElevenLabsConvaiAgent 
} from "../../utils/elevenlabsClient.ts";

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

// Schema for creating/updating an AI agent
const agentSchema = z.object({
  agent_name: z.string().min(1, "Agent name is required"),
  elevenlabs_voice_id: z.string().min(1, "Voice ID is required"),
  system_prompt: z.string().min(1, "System prompt is required"),
  description: z.string().optional(),
  is_shared: z.boolean().default(false)
});

// Schema for pagination query parameters
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate JWT and get user ID
    const userId = await getUserIdFromToken(req.headers.get('Authorization'));

    // Get Supabase client
    const supabase = getSupabaseServiceClient();

    // Verify user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (userError || !user?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const url = new URL(req.url);
    const agentId = url.pathname.split('/').pop();

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET': {
        // List all agents or get single agent details
        if (!agentId || agentId === 'list') {
          // Parse pagination parameters
          const queryParams = Object.fromEntries(url.searchParams.entries());
          const { page, limit } = paginationSchema.parse(queryParams);
          const offset = (page - 1) * limit;

          // Fetch paginated list of agents with owner email
          const { data: agents, error: listError, count } = await supabase
            .from('ai_agents')
            .select(`
              *,
              owner:users(email)
            `, { count: 'exact' })
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

          if (listError) throw listError;

          return new Response(
            JSON.stringify({
              agents,
              meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: count || 0,
                totalPages: count ? Math.ceil(count / limit) : 0
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Get single agent details
          const { data: agent, error: getError } = await supabase
            .from('ai_agents')
            .select(`
              *,
              owner:users(email)
            `)
            .eq('id', agentId)
            .single();

          if (getError) {
            if (getError.code === 'PGRST116') {
              return new Response(
                JSON.stringify({ error: 'Agent not found' }),
                { 
                  status: 404, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            }
            throw getError;
          }

          return new Response(
            JSON.stringify(agent),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'POST': {
        // Create new agent
        const body = await req.json();
        const validatedData = agentSchema.parse(body);

        // Create agent in ElevenLabs
        const elAgent = await createElevenLabsConvaiAgent({
          agent_name: validatedData.agent_name,
          elevenlabs_voice_id: validatedData.elevenlabs_voice_id,
          system_prompt: validatedData.system_prompt
        });

        // Create agent in database
        const { data: newAgent, error: createError } = await supabase
          .from('ai_agents')
          .insert({
            ...validatedData,
            owner_user_id: userId,
            elevenlabs_agent_id: elAgent.agent_id
          })
          .select()
          .single();

        if (createError) throw createError;

        return new Response(
          JSON.stringify(newAgent),
          { 
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      case 'PUT': {
        // Update existing agent
        if (!agentId) {
          return new Response(
            JSON.stringify({ error: 'Agent ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        const body = await req.json();
        const validatedData = agentSchema.parse(body);

        // Get existing agent
        const { data: existingAgent, error: getError } = await supabase
          .from('ai_agents')
          .select('elevenlabs_agent_id')
          .eq('id', agentId)
          .single();

        if (getError) {
          if (getError.code === 'PGRST116') {
            return new Response(
              JSON.stringify({ error: 'Agent not found' }),
              { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          throw getError;
        }

        // Update agent in ElevenLabs
        const elAgent = await updateElevenLabsConvaiAgent(
          existingAgent.elevenlabs_agent_id,
          {
            agent_name: validatedData.agent_name,
            elevenlabs_voice_id: validatedData.elevenlabs_voice_id,
            system_prompt: validatedData.system_prompt
          }
        );

        // Update agent in database
        const { data: updatedAgent, error: updateError } = await supabase
          .from('ai_agents')
          .update({
            ...validatedData,
            elevenlabs_agent_id: elAgent?.agent_id || existingAgent.elevenlabs_agent_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', agentId)
          .select()
          .single();

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify(updatedAgent),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'DELETE': {
        // Delete agent
        if (!agentId) {
          return new Response(
            JSON.stringify({ error: 'Agent ID is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Get agent details first
        const { data: agent, error: getError } = await supabase
          .from('ai_agents')
          .select('elevenlabs_agent_id')
          .eq('id', agentId)
          .single();

        if (getError) {
          if (getError.code === 'PGRST116') {
            return new Response(
              JSON.stringify({ error: 'Agent not found' }),
              { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          throw getError;
        }

        // Try to delete from ElevenLabs first (ignore 404)
        if (agent.elevenlabs_agent_id) {
          try {
            await deleteElevenLabsConvaiAgent(agent.elevenlabs_agent_id);
          } catch (elError) {
            // Log but don't fail if EL deletion fails
            console.warn('Failed to delete ElevenLabs agent:', elError);
          }
        }

        // Delete from database
        const { error: deleteError } = await supabase
          .from('ai_agents')
          .delete()
          .eq('id', agentId);

        if (deleteError) throw deleteError;

        return new Response(null, { 
          status: 204,
          headers: corsHeaders
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { 
            status: 405, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

  } catch (error) {
    console.error('Function error:', error);
    
    const status = error.message.includes('Authorization') || 
                  error.message.includes('token') ? 401
                  : error.message.includes('validation failed') ? 400
                  : error.message.includes('not found') ? 404
                  : 500;
                  
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});