import { defineEventHandler, createError } from 'h3';
import { serverSupabaseClient } from '#supabase/server';

export default defineEventHandler(async (event) => {
  try {
    console.log('[Proxy API] Invoking Edge Function: list-elevenlabs-voices');
    const supabase = await serverSupabaseClient(event);

    const { data, error: invokeError } = await supabase.functions.invoke('list-elevenlabs-voices', {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (invokeError) {
      console.error('[Proxy API] Edge Function error:', invokeError);
      throw invokeError;
    }

    console.log('[Proxy API] Edge Function Response:', data);
    return data;

  } catch (error) {
    console.error('[Proxy API] Error:', error);
    throw createError({
      statusCode: error.status || 500,
      statusMessage: error.message || 'Failed to fetch voices'
    });
  }
});