import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Create Supabase client with error handling
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Proxy route for ElevenLabs voices
app.get('/elevenlabs/voices', async (req, res) => {
  console.log('[Express Server] Received request for ElevenLabs voices');

  try {
    // Add timeout to the Edge Function call
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    );

    const fetchPromise = supabase.functions.invoke('list-elevenlabs-voices', {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Race between the fetch and timeout
    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (error) {
      console.error('[Express Server] Edge Function error:', error);
      return res.status(500).json({
        error: 'Failed to fetch voices',
        message: error.message || 'Unknown error occurred'
      });
    }

    if (!data || !data.voices) {
      console.error('[Express Server] Invalid response format from Edge Function');
      return res.status(502).json({
        error: 'Invalid response',
        message: 'Received invalid data format from voice service'
      });
    }

    console.log(`[Express Server] Successfully retrieved ${data.voices.length} voices`);
    res.json(data);

  } catch (error) {
    console.error('[Express Server] Error:', error);
    
    // Handle specific error types
    if (error.message === 'Request timeout') {
      return res.status(504).json({
        error: 'Gateway Timeout',
        message: 'Request to voice service timed out'
      });
    }

    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

// Start server
app.listen(port, () => {
  console.log(`[Express Server] Proxy server running at http://localhost:${port}`);
  console.log('[Express Server] Environment:', {
    port,
    supabaseConfigured: !!supabaseUrl && !!supabaseAnonKey
  });
});