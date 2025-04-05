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

// Schema for creating a contact
const createContactSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string()
    .regex(/^\+?[0-9\s-()]{8,}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'client'])
    .default('new'),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  interested_property_id: z.string().uuid().optional().nullable(),
}).refine(
  data => data.email || data.phone,
  { message: "Either email or phone must be provided" }
);

type CreateContactPayload = z.infer<typeof createContactSchema>;

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
    const validationResult = createContactSchema.safeParse(body);

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

    // Use Service Role Client to insert the contact
    const supabase = getSupabaseServiceClient();

    // Check if property exists if interested_property_id is provided
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

    // Check for duplicate email if provided
    if (validatedData.email) {
      const { data: existingContact, error: checkError } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId)
        .eq('email', validatedData.email)
        .maybeSingle();

      if (existingContact) {
        return new Response(
          JSON.stringify({ error: 'A contact with this email already exists' }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Prepare data for insertion
    const insertData = {
      ...validatedData,
      user_id: userId
    };

    // Insert the new contact
    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert(insertData)
      .select(`
        *,
        interested_property:properties(
          id,
          name,
          property_type,
          status
        )
      `)
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to create contact');
    }

    return new Response(
      JSON.stringify(newContact),
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