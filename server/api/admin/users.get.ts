import { defineEventHandler, createError, getQuery } from 'h3';
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';

export default defineEventHandler(async (event) => {
  // 1. Ensure user is authenticated
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // 2. Get Supabase client tied to the request
  const supabase = await serverSupabaseClient(event);

  // 3. Get pagination query parameters
  const query = getQuery(event);
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);

  try {
    // 4. Call the PostgreSQL function using RPC
    const { data, error } = await supabase.rpc('get_user_list');

    if (error) {
      // Check if error is due to non-admin access
      if (error.message.includes('Access denied: User is not an administrator')) {
        throw createError({ 
          statusCode: 403, 
          statusMessage: 'Forbidden: Admin role required' 
        });
      }

      // Handle other database errors
      console.error('Error calling get_user_list:', error);
      throw createError({ 
        statusCode: 500, 
        statusMessage: 'Failed to retrieve user list' 
      });
    }

    // 5. Handle pagination in memory since the DB function doesn't support it
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedUsers = data?.slice(start, end) || [];

    // 6. Return paginated results with metadata
    return {
      users: paginatedUsers,
      totalItems: data?.length || 0,
      currentPage: page,
      itemsPerPage: limit,
      totalPages: Math.ceil((data?.length || 0) / limit)
    };

  } catch (error: any) {
    // Re-throw H3 errors
    if (error.statusCode) {
      throw error;
    }

    // Log unexpected errors
    console.error('Unexpected error in /api/admin/users:', error);
    throw createError({ 
      statusCode: 500, 
      statusMessage: 'An unexpected error occurred while fetching users' 
    });
  }
});