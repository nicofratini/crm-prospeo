import { defineEventHandler, createError } from 'h3';
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';
import { useSupabaseServiceRole } from '#supabase/server';

export default defineEventHandler(async (event) => {
  // 1. Get authenticated user
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ 
      statusCode: 401, 
      statusMessage: 'Unauthorized' 
    });
  }

  const userId = user.id;
  console.log(`[POST /api/properties] User ID from session: ${userId}`);

  // 2. Verify user exists in database using Service Role client
  const supabaseService = useSupabaseServiceRole();
  try {
    const { data: userCheck, error: checkError } = await supabaseService
      .from('users')
      .select('id, email_confirmed_at')
      .eq('id', userId)
      .single();

    if (checkError) {
      console.error(`[POST /api/properties] Error checking user ${userId} in users:`, checkError);
      throw createError({ 
        statusCode: 500, 
        statusMessage: `DB Error: Failed to verify user ${userId} existence.` 
      });
    }

    if (!userCheck) {
      console.error(`[POST /api/properties] CRITICAL: User ${userId} NOT FOUND in users right before property insert!`);
      throw createError({ 
        statusCode: 500, 
        statusMessage: `Consistency Error: User ${userId} not found.` 
      });
    }

    console.log(`[POST /api/properties] User ${userId} successfully verified in users table.`);

    // 3. Get request body
    const body = await readBody(event);

    // 4. Validate required fields
    if (!body.name || !body.property_type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: name and property_type are required'
      });
    }

    // 5. Insert property using standard client (with RLS)
    const supabase = await serverSupabaseClient(event);
    const { data: property, error: insertError } = await supabase
      .from('properties')
      .insert({
        ...body,
        user_id: userId
      })
      .select('*')
      .single();

    if (insertError) {
      console.error(`[POST /api/properties] Error inserting property for user ${userId}:`, insertError);
      throw createError({
        statusCode: 400,
        statusMessage: insertError.message
      });
    }

    // 6. Return created property
    return property;

  } catch (error: any) {
    // Re-throw H3 errors
    if (error.statusCode) {
      throw error;
    }

    // Log unexpected errors
    console.error('[POST /api/properties] Unexpected error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'An unexpected error occurred while creating property'
    });
  }
});