import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseServiceClient } from "../utils/supabaseServiceClient.ts";

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
    const { email, password } = await req.json();

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const supabase = getSupabaseServiceClient();

    // Create the user
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email
    });

    if (signUpError) throw signUpError;

    // Set user as admin
    const { error: adminError } = await supabase.rpc(
      'set_user_as_admin',
      { user_email: email }
    );

    if (adminError) throw adminError;

    return new Response(
      JSON.stringify({ 
        message: 'Admin user created successfully',
        user: authData.user
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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