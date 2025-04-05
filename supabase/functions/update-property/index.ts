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

// Schema for updating a property (similar to create, but fields optional)
const updatePropertySchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  property_type: z.enum(['Maison', 'Appartement']).optional(),
  status: z.enum(['active', 'inactive', 'sold']).optional(),
  price: z.number().positive().optional().nullable(),
  area_sqm: z.number().positive().optional().nullable(),
  num_rooms: z.number().int().positive().optional().nullable(),
  num_bedrooms: z.number().int().positive().optional().nullable(),
  num_bathrooms: z.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  main_image_url: z.string().url().optional().nullable(),
  virtual_tour_url: z.string().url().optional().nullable()
}).strict();

type UpdatePropertyPayload = z.infer<typeof updatePropertySchema>;

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

    // Extract property ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const propertyId = pathParts[pathParts.length - 1];

    if (!propertyId || !z.string().uuid().safeParse(propertyId).success) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing property ID in URL path' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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

    const validationResult = updatePropertySchema.safeParse(body);
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

    // Ensure there's something to update
    if (Object.keys(validatedData).length === 0) {
      return new Response(
        JSON.stringify({ error: 'Request body must contain at least one field to update' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Update the property, ensuring ownership with WHERE clause
    const { data: updatedProperty, error: dbError } = await supabase
      .from('properties')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', propertyId)
      .eq('user_id', userId)
      .select(`
        *,
        user:users(
          id,
          name,
          email
        )
      `)
      .single();

    if (dbError) {
      console.error('Database update error:', dbError);
      throw new Error('Failed to update property');
    }

    if (!updatedProperty) {
      return new Response(
        JSON.stringify({ error: 'Property not found or update forbidden' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify(updatedProperty),
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