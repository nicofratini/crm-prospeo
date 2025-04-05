import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

// Enable CORS with specific origin
app.use(cors({
  origin: 'http://localhost:5173', // Allow requests from Vite dev server
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// Create Supabase client with error handling
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables for Supabase connection');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Proxy route for shared AI agents
app.get('/api/ai/shared-agents', async (req, res) => {
  try {
    console.log('[Express Server] Proxying request to list-shared-agents endpoint');
    
    // Get Authorization header from incoming request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    // Invoke the Edge Function
    const { data, error: invokeError } = await supabase.functions.invoke(
      'list-shared-agents',
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      }
    );

    if (invokeError) {
      console.error('[Express Server] Edge Function error:', invokeError);
      throw invokeError;
    }

    console.log('[Express Server] Successfully retrieved shared agents');
    res.json(data);

  } catch (error) {
    console.error('[Express Server] Error:', error);
    res.status(error.status || 500).json({ 
      error: error.message || 'Failed to fetch shared agents' 
    });
  }
});

// Proxy route for assigning shared agent
app.post('/api/ai/assign-agent', async (req, res) => {
  try {
    console.log('[Express Server] Proxying request to assign-shared-agent endpoint');
    
    // Get Authorization header from incoming request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    // Invoke the Edge Function
    const { data, error: invokeError } = await supabase.functions.invoke(
      'assign-shared-agent',
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: req.body
      }
    );

    if (invokeError) {
      console.error('[Express Server] Edge Function error:', invokeError);
      throw invokeError;
    }

    console.log('[Express Server] Successfully assigned agent');
    res.json(data);

  } catch (error) {
    console.error('[Express Server] Error:', error);
    res.status(error.status || 500).json({ 
      error: error.message || 'Failed to assign agent' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    supabaseConnected: !!supabase
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Express Server] Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message
  });
});

app.listen(port, () => {
  console.log(`[Express Server] Proxy server running at http://localhost:${port}`);
  console.log('[Express Server] Supabase client initialized');
});