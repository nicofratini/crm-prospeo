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

// Schema for request body
const filterSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'sold']).optional(),
  property_type: z.enum(['Maison', 'Appartement']).optional(),
  sort: z.enum(['created_at', 'name', 'price', 'status', 'property_type']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

type FilterParams = z.infer<typeof filterSchema>;

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
    const validationResult = filterSchema.safeParse(body);

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

    const { page, limit, search, status, property_type, sort, order }: FilterParams = validationResult.data;
    const offset = (page - 1) * limit;

    // Use Service Role Client to query properties
    const supabase = getSupabaseServiceClient();
    let query = supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply filters
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,` +
        `address.ilike.%${search}%,` +
        `description.ilike.%${search}%`
      );
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (property_type) {
      query = query.eq('property_type', property_type);
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: properties, error: dbError, count } = await query;

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to fetch properties');
    }

    return new Response(
      JSON.stringify({
        data: properties,
        meta: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: count || 0,
          totalPages: count ? Math.ceil(count / limit) : 0,
          sort,
          order
        }
      }),
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