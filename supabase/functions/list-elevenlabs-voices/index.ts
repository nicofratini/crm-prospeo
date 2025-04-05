import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { getElevenLabsVoices } from "../utils/elevenlabsClient.ts";

serve(async (req) => {
  console.log('[list-elevenlabs-voices] Function invoked with method:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[list-elevenlabs-voices] Handling OPTIONS preflight request');
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  if (req.method !== 'GET') {
    console.log('[list-elevenlabs-voices] Invalid method:', req.method);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Check for ELEVENLABS_API_KEY
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.error('[list-elevenlabs-voices] ELEVENLABS_API_KEY not set');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error',
          details: 'ElevenLabs API key is not configured'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[list-elevenlabs-voices] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate API key format (basic check)
    if (!apiKey.match(/^[a-zA-Z0-9]{32}$/)) {
      console.error('[list-elevenlabs-voices] Invalid API key format');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error',
          details: 'Invalid ElevenLabs API key format'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[list-elevenlabs-voices] Fetching voices from ElevenLabs API...');
    
    // Test ElevenLabs API connectivity
    try {
      const testResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'Accept': 'application/json',
          'xi-api-key': apiKey
        }
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.json().catch(() => ({}));
        console.error('[list-elevenlabs-voices] ElevenLabs API error:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          error: errorData
        });
        
        return new Response(
          JSON.stringify({ 
            error: 'ElevenLabs API error',
            details: `API returned ${testResponse.status}: ${testResponse.statusText}`
          }),
          { 
            status: testResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } catch (error) {
      console.error('[list-elevenlabs-voices] Failed to connect to ElevenLabs API:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Connection error',
          details: 'Failed to connect to ElevenLabs API'
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const voices = await getElevenLabsVoices();
    
    if (!Array.isArray(voices)) {
      console.error('[list-elevenlabs-voices] Invalid response format from ElevenLabs API:', voices);
      return new Response(
        JSON.stringify({ 
          error: 'API response error',
          details: 'Invalid response format from ElevenLabs API'
        }),
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[list-elevenlabs-voices] Successfully fetched ${voices.length} voices`);
    return new Response(
      JSON.stringify({ voices }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        }
      }
    );

  } catch (error) {
    console.error('[list-elevenlabs-voices] Function error:', error);
    
    let status = 500;
    let message = 'An internal server error occurred';
    let details = error.message;

    if (error.message.includes('ELEVENLABS_API_KEY')) {
      message = 'ElevenLabs API key is not configured';
    } else if (error.message.includes('Invalid response format')) {
      status = 502;
      message = 'Invalid response from ElevenLabs API';
    } else if (error.message.includes('fetch') || error.message.includes('Failed to connect')) {
      status = 503;
      message = 'Failed to connect to ElevenLabs API';
    }
    
    return new Response(
      JSON.stringify({ 
        error: message,
        details: details
      }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});