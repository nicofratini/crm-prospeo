```typescript
import { defineEventHandler, readBody, createError } from 'h3';
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';
import { useSupabaseServiceRole } from '#supabase/server';
import { z } from 'zod';

// Validation schema for request body
const assignAgentSchema = z.object({
  targetUserId: z.string().uuid('Invalid target user ID format'),
  sourceAgentConfigId: z.string().uuid('Invalid source agent config ID format')
});

export default defineEventHandler(async (event) => {
  try {
    // 1. Ensure user is authenticated and is admin
    const user = await serverSupabaseUser(event);
    if (!user) {
      throw createError({ 
        statusCode: 401, 
        statusMessage: 'Unauthorized' 
      });
    }

    // 2. Get service role client for admin operations
    const supabaseService = useSupabaseServiceRole();

    // 3. Verify caller is admin
    const { data: adminCheck, error: adminCheckError } = await supabaseService
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (adminCheckError || !adminCheck?.is_admin) {
      console.warn(`User ${user.id} attempted admin operation without rights`);
      throw createError({ 
        statusCode: 403, 
        statusMessage: 'Forbidden: Admin role required' 
      });
    }

    // 4. Read and validate request body
    const body = await readBody(event);
    const validationResult = assignAgentSchema.safeParse(body);

    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body: ' + validationResult.error.message
      });
    }

    const { targetUserId, sourceAgentConfigId } = validationResult.data;

    // 5. Verify target user exists
    const { data: targetUser, error: targetUserError } = await supabaseService
      .from('users')
      .select('id')
      .eq('id', targetUserId)
      .single();

    if (targetUserError || !targetUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Target user not found'
      });
    }

    // 6. Fetch source agent configuration
    const { data: sourceConfig, error: sourceError } = await supabaseService
      .from('ai_agents')
      .select('agent_name, elevenlabs_voice_id, system_prompt')
      .eq('id', sourceAgentConfigId)
      .single();

    if (sourceError) {
      console.error('Error fetching source agent config:', sourceError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching source agent configuration'
      });
    }

    if (!sourceConfig) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Source agent configuration not found'
      });
    }

    // 7. Upsert target user's agent configuration
    const { data: updatedConfig, error: upsertError } = await supabaseService
      .from('ai_agents')
      .upsert({
        user_id: targetUserId,
        agent_name: sourceConfig.agent_name,
        elevenlabs_voice_id: sourceConfig.elevenlabs_voice_id,
        system_prompt: sourceConfig.system_prompt,
        elevenlabs_agent_id: null, // Reset EL Agent ID
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error assigning agent config:', upsertError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to assign agent configuration'
      });
    }

    // 8. Return success with updated configuration
    return {
      message: 'Agent configuration assigned successfully',
      config: updatedConfig
    };

  } catch (error: any) {
    // Re-throw H3 errors
    if (error.statusCode) {
      throw error;
    }

    // Log unexpected errors
    console.error('Unexpected error in /api/admin/assign-agent-config:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'An unexpected error occurred while assigning agent configuration'
    });
  }
});
```