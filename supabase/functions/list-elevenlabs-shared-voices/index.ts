import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

console.log("[list-elevenlabs-shared-voices] Function started");

serve(async (req) => {
  console.log(`[list-elevenlabs-shared-voices] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    console.log("[list-elevenlabs-shared-voices] Handling OPTIONS preflight request");
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    console.log("[list-elevenlabs-shared-voices] Invalid method:", req.method);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.error('[list-elevenlabs-shared-voices] ELEVENLABS_API_KEY not set');
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

    // Get query parameters from request URL
    const url = new URL(req.url);
    const queryParams = new URLSearchParams();

    // Map and validate query parameters
    const validParams = [
      'page_size',
      'next_page_token',
      'search',
      'language',
      'accent',
      'age',
      'gender',
      'use_case',
      'category',
      'voice_type',
      'sort',
      'sort_direction',
      'include_total_count'
    ];

    // Copy valid parameters from request to API query
    validParams.forEach(param => {
      const value = url.searchParams.get(param);
      if (value) {
        queryParams.append(param, value);
      }
    });

    // Set defaults if not provided
    if (!queryParams.has('page_size')) {
      queryParams.append('page_size', '100');
    }
    if (!queryParams.has('include_total_count')) {
      queryParams.append('include_total_count', 'true');
    }

    // Build ElevenLabs API URL
    const apiUrl = `https://api.elevenlabs.io/v1/shared-voices${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    console.log('[list-elevenlabs-shared-voices] Fetching from ElevenLabs:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[list-elevenlabs-shared-voices] ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'ElevenLabs API error',
          details: `API returned ${response.status}: ${response.statusText}`
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.voices || !Array.isArray(data.voices)) {
      throw new Error('Invalid response format from ElevenLabs API');
    }

    // Process and enhance voice data
    const processedVoices = data.voices.map(voice => ({
      ...voice,
      // Ensure consistent structure with private voices
      voice_id: voice.voice_id,
      name: voice.name,
      preview_url: voice.preview_url,
      category: voice.category || voice.sharing?.category,
      labels: {
        ...voice.labels,
        ...voice.sharing?.labels,
        language: voice.verified_languages?.[0]?.language || 
                 voice.labels?.language || 
                 voice.sharing?.labels?.language ||
                 'en',
        accent: voice.verified_languages?.[0]?.accent ||
                voice.labels?.accent ||
                voice.sharing?.labels?.accent
      }
    }));

    console.log(`[list-elevenlabs-shared-voices] Successfully fetched ${processedVoices.length} voices`);
    
    return new Response(
      JSON.stringify({ 
        voices: processedVoices,
        has_more: data.has_more || false,
        total_count: data.total_count || processedVoices.length,
        next_page_token: data.next_page_token
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      }
    );

  } catch (error) {
    console.error('[list-elevenlabs-shared-voices] Function error:', error);
    
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