import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { generateSpeech } from "../utils/elevenlabsClient.ts";
import { z } from "npm:zod@3.22.4";

// Schema for request body
const ttsRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  voiceId: z.string().min(1, "Voice ID is required"),
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
  style: z.number().min(0).max(1).optional(),
  useSpeakerBoost: z.boolean().optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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

    const validationResult = ttsRequestSchema.safeParse(body);
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

    const { text, voiceId, stability, similarityBoost, style, useSpeakerBoost } = validationResult.data;

    const audioBuffer = await generateSpeech(text, voiceId, {
      stability: stability ?? 0.75,
      similarity_boost: similarityBoost ?? 0.75,
      style: style,
      use_speaker_boost: useSpeakerBoost ?? true
    });

    return new Response(
      audioBuffer,
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString()
        }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});