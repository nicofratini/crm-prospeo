/*
  # Create AI Agent Placeholder Trigger

  1. Changes
    - Create function to automatically create AI agent placeholder when user confirms email
    - Create trigger to execute function on email confirmation
    - Add validation to ensure one agent per user
    - Add comments and error handling

  2. Security
    - Function runs with SECURITY DEFINER to ensure proper permissions
    - Explicit search_path to prevent search path injection
    - Proper error handling and logging
*/

-- Function to create a placeholder ai_agents record for a new confirmed user
CREATE OR REPLACE FUNCTION public.handle_new_user_create_agent_placeholder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Necessary to insert into ai_agents potentially owned by 'postgres'
SET search_path = public -- Explicitly set search path for security
AS $$
DECLARE
    -- Define sensible defaults for the placeholder agent
    default_voice_id text := '21m00Tcm4TlvDq8ikWAM'; -- Rachel voice ID
    default_agent_name text := 'Mon Assistant Prospeo';
    default_system_prompt text := 'Vous êtes un assistant IA expert en immobilier pour l''agence Prospeo. Votre rôle est d''aider les agents immobiliers à gérer leurs contacts et leurs biens, ainsi que de répondre aux appels des clients potentiels de manière professionnelle et courtoise.';
BEGIN
    -- Log the trigger execution for debugging
    RAISE LOG 'Creating AI agent placeholder for user %', NEW.id;

    -- Only proceed if the user doesn't already have an agent
    IF NOT EXISTS (
        SELECT 1 FROM public.ai_agents 
        WHERE user_id = NEW.id
    ) THEN
        -- Insert placeholder into ai_agents table
        INSERT INTO public.ai_agents (
            user_id,
            agent_name,
            elevenlabs_voice_id,
            system_prompt,
            elevenlabs_agent_id,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            default_agent_name,
            default_voice_id,
            default_system_prompt,
            NULL, -- No EL agent ID created automatically
            now(),
            now()
        );

        RAISE LOG 'AI agent placeholder created successfully for user %', NEW.id;
    ELSE
        RAISE LOG 'AI agent already exists for user %, skipping creation', NEW.id;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log any errors but don't prevent user creation/update
    RAISE LOG 'Error creating AI agent placeholder for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.handle_new_user_create_agent_placeholder() IS 
'Creates a default AI agent configuration when a user confirms their email address.';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_user_confirmed_create_agent ON auth.users;

-- Create the trigger to run AFTER a user's email is confirmed
CREATE TRIGGER on_user_confirmed_create_agent
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (
        -- Only trigger on the first confirmation (old value null, new value not null)
        OLD.email_confirmed_at IS NULL AND 
        NEW.email_confirmed_at IS NOT NULL
    )
    EXECUTE FUNCTION public.handle_new_user_create_agent_placeholder();

-- Add comment to the trigger
COMMENT ON TRIGGER on_user_confirmed_create_agent ON auth.users IS 
'When a user confirms their email, create a default placeholder entry in the ai_agents table.';

-- Ensure unique constraint exists for one agent per user
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_agent'
    ) THEN
        ALTER TABLE public.ai_agents 
        ADD CONSTRAINT unique_user_agent UNIQUE (user_id);
    END IF;
END $$;