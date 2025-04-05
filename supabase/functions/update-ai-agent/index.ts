import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verify } from "npm:djwt@3.0.0";
import { z } from "npm:zod@3.22.4";
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseServiceClient } from "../utils/supabaseServiceClient.ts";
import { createElevenLabsAgent, updateElevenLabsAgent, getElevenLabsAgent } from "../utils/elevenlabsClient.ts";

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

// Schema for updating an AI agent
const updateAgentSchema = z.object({
  agent_name: z.string().min(1, "Agent name is required").optional(),
  elevenlabs_voice_id: z.string().min(1, "Voice ID is required").optional(),
  system_prompt: z.string().optional(),
}).strict();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'PUT' && req.method !== 'PATCH') {
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

    const validationResult = updateAgentSchema.safeParse(body);
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

    const validatedData = validationResult.data;

    const supabase = getSupabaseServiceClient();

    // Get current agent configuration
    const { data: currentAgent, error: fetchError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // Ignore not found error
      console.error('Database fetch error:', fetchError);
      throw new Error('Failed to fetch current agent configuration');
    }

    let elevenlabsAgent = null;
    let newElAgentId = currentAgent?.elevenlabs_agent_id || null;

    // Handle ElevenLabs agent update if voice ID is changing
    if (validatedData.elevenlabs_voice_id) {
      try {
        const agentPayload = {
          name: validatedData.agent_name || currentAgent?.agent_name || 'AI Agent',
          voice_id: validatedData.elevenlabs_voice_id,
          initial_system_prompt: validatedData.system_prompt || currentAgent?.system_prompt || ''
        };

        if (newElAgentId) {
          // Try to update existing EL agent
          console.log(`Attempting to update EL Agent ID: ${newElAgentId}`);
          elevenlabsAgent = await updateElevenLabsAgent(newElAgentId, agentPayload);
        } else {
          // Create new EL agent
          console.log('Creating new EL Agent');
          elevenlabsAgent = await createElevenLabsAgent(agentPayload);
        }

        newElAgentId = elevenlabsAgent?.agent_id;

        if (!newElAgentId) {
          throw new Error('Failed to get Agent ID from ElevenLabs');
        }

      } catch (elError: any) {
        // If update failed with 404, try to create new agent
        if (newElAgentId && (elError.status === 404 || elError.response?.status === 404)) {
          console.warn(`EL Agent ${newElAgentId} not found, creating new one`);
          try {
            elevenlabsAgent = await createElevenLabsAgent({
              name: validatedData.agent_name || currentAgent?.agent_name || 'AI Agent',
              voice_id: validatedData.elevenlabs_voice_id,
              initial_system_prompt: validatedData.system_prompt || currentAgent?.system_prompt || ''
            });
            newElAgentId = elevenlabsAgent?.agent_id;
            if (!newElAgentId) throw new Error('Failed to get Agent ID after creation');
          } catch (createError) {
            console.error('Error creating EL Agent:', createError);
            throw new Error('Failed to create new agent with ElevenLabs');
          }
        } else {
          console.error('ElevenLabs API error:', elError);
          throw new Error('Failed to update agent with ElevenLabs');
        }
      }
    }

    // Update database record
    const { data: updatedAgent, error: updateError } = await supabase
      .from('ai_agents')
      .upsert({
        user_id: userId,
        agent_name: validatedData.agent_name || currentAgent?.agent_name,
        elevenlabs_voice_id: validatedData.elevenlabs_voice_id || currentAgent?.elevenlabs_voice_id,
        system_prompt: validatedData.system_prompt || currentAgent?.system_prompt,
        elevenlabs_agent_id: newElAgentId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to save agent configuration');
    }

    return new Response(
      JSON.stringify(updatedAgent),
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