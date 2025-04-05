import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verify } from "npm:djwt@3.0.0";
import { z } from "npm:zod@3.22.4";
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseServiceClient } from "../utils/supabaseServiceClient.ts";
import { getCalComBookings } from "../utils/calcomClient.ts";

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

// Schema for query parameters
const querySchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled']).optional(),
  type: z.enum(['visit', 'call', 'signing', 'valuation', 'other']).optional(),
  contact_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  include_calcom: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
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

    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = querySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid query parameters', details: validationResult.error.flatten() }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { dateFrom, dateTo, status, type, contact_id, property_id, include_calcom } = validationResult.data;

    const supabase = getSupabaseServiceClient();

    // Query local appointments
    let query = supabase
      .from('appointments')
      .select(`
        *,
        contact:contacts(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        property:properties(
          id,
          name,
          address,
          property_type
        )
      `)
      .eq('user_id', userId);

    // Apply filters
    if (dateFrom) query = query.gte('start_time', dateFrom);
    if (dateTo) query = query.lte('end_time', dateTo);
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);
    if (contact_id) query = query.eq('contact_id', contact_id);
    if (property_id) query = query.eq('property_id', property_id);

    // Order by start time
    query = query.order('start_time', { ascending: true });

    const { data: localAppointments, error: dbError } = await query;

    if (dbError) {
      console.error('Database query error:', dbError);
      throw new Error('Failed to fetch appointments');
    }

    // Fetch Cal.com bookings if enabled
    let calcomAppointments = [];
    if (include_calcom) {
      try {
        calcomAppointments = await getCalComBookings({ dateFrom, dateTo });
      } catch (calcomError) {
        console.error('Cal.com fetch error:', calcomError);
        // Don't fail completely if Cal.com fails
      }
    }

    // Merge and deduplicate appointments
    const mergedAppointments = [
      ...localAppointments,
      ...calcomAppointments.filter(calcomAppt => 
        !localAppointments.some(localAppt => 
          localAppt.calcom_booking_id === calcomAppt.calcom_booking_id
        )
      )
    ];

    // Sort by start time
    mergedAppointments.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    return new Response(
      JSON.stringify({
        appointments: mergedAppointments,
        meta: {
          total: mergedAppointments.length,
          local_count: localAppointments.length,
          calcom_count: calcomAppointments.length
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