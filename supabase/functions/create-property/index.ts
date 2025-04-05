import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verify } from "npm:djwt@3.0.0";
import { z } from "npm:zod@3.22.4";
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseServiceClient } from "../utils/supabaseServiceClient.ts";

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

// Schema for creating a property
const createPropertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address: z.string().optional().nullable(),
  property_type: z.enum(['Maison', 'Appartement']),
  status: z.enum(['active', 'inactive', 'sold']).default('active'),
  price: z.number().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  
  // Additional fields
  city: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  area_sqm: z.number().positive().optional().nullable(),
  num_rooms: z.number().int().positive().optional().nullable(),
  num_bedrooms: z.number().int().positive().optional().nullable(),
  num_bathrooms: z.number().int().positive().optional().nullable(),
  main_image_url: z.string().url().optional().nullable(),
  virtual_tour_url: z.string().url().optional().nullable(),
  features: z.array(z.string()).optional().nullable(),
  energy_rating: z.string().optional().nullable(),
  year_built: z.number().int().positive().optional().nullable()
});

type CreatePropertyPayload = z.infer<typeof createPropertySchema>;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Require POST method
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
    // Validate JWT and get user ID
    const userId = await getUserIdFromToken(req.headers.get('Authorization'));

    // Parse and validate request body
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

    // Validate body against schema
    const validationResult = createPropertySchema.safeParse(body);

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

    // Use Service Role Client to insert the property
    const supabase = getSupabaseServiceClient();

    // Prepare data for insertion
    const insertData = {
      ...validatedData,
      user_id: userId
    };

    // Insert the new property
    const { data: newProperty, error: insertError } = await supabase
      .from('properties')
      .insert(insertData)
      .select(`
        *,
        user:users(
          id,
          name,
          email
        )
      `)
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to create property');
    }

    return new Response(
      JSON.stringify(newProperty),
      { 
        status: 201,
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