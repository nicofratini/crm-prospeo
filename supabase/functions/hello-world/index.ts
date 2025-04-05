import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

console.log("[hello-world] Function script started");

serve(async (req) => {
  console.log(`[hello-world] Received ${req.method} request`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log("[hello-world] Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("[hello-world] Processing request");
    const data = {
      message: 'Hello from Edge!',
      timestamp: new Date().toISOString(),
      method: req.method
    };

    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error("[hello-world] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      }
    );
  }
});