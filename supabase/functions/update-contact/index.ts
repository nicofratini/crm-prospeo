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

// Schema for updating a contact (optional fields)
const updateContactSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string()
    .regex(/^\+?[0-9\s-()]{8,}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'client'])
    .optional(),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  interested_property_id: z.string().uuid().optional().nullable()
}).strict().refine(
  data => Object.keys(data).length > 0,
  { message: "Request body must contain at least one field to update" }
);

type UpdateContactPayload = z.infer<typeof updateContactSchema>;

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

    // Extract contact ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const contactId = pathParts[pathParts.length - 1];

    if (!contactId || !z.string().uuid().safeParse(contactId).success) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing contact ID in URL path' }),
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

    const validationResult = updateContactSchema.safeParse(body);
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

    const supabase = getSupabaseServiceClient();

    // If updating interested_property_id, verify it exists and user owns it
    if (validatedData.interested_property_id) {
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id')
        .eq('id', validatedData.interested_property_id)
        .eq('user_id', userId)
        .single();

      if (propertyError || !property) {
        return new Response(
          JSON.stringify({ error: 'Invalid or inaccessible property ID' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Update contact, ensuring ownership
    const { data: updatedContact, error: dbError } = await supabase
      .from('contacts')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .eq('user_id', userId)
      .select(`
        *,
        interested_property:properties(
          id,
          name,
          address,
          property_type,
          status,
          price
        )
      `)
      .single();

    if (dbError) {
      // Handle unique constraint violation on email
      if (dbError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Email address already exists for another contact' }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      throw dbError;
    }

    if (!updatedContact) {
      return new Response(
        JSON.stringify({ error: 'Contact not found or update forbidden' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get recent calls for this contact
    const { data: recentCalls, error: callsError } = await supabase
      .from('call_history')
      .select(`
        id,
        call_timestamp,
        duration_seconds,
        status,
        summary
      `)
      .eq('contact_id', contactId)
      .order('call_timestamp', { ascending: false })
      .limit(5);

    if (callsError) {
      console.error('Error fetching recent calls:', callsError);
      // Don't fail the whole request if calls fetch fails
    }

    return new Response(
      JSON.stringify({
        contact: updatedContact,
        recentCalls: recentCalls || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    const status = error.message.includes('Authorization') || 
                  error.message.includes('token') ? 401
                  : error.message.includes('JSON') ? 400
                  : error.message.includes('forbidden') ? 404
                  : error.message.includes('already exists') ? 409
                  : 500;
                  
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});