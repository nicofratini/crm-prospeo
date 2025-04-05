/*
  # Add ElevenLabs Agent ID to AI Agents Table

  1. Changes
    - Add `elevenlabs_agent_id` column to `ai_agents` table
    - Add comment explaining the column's purpose
    - Add index for efficient lookups

  2. Security
    - No changes to RLS policies needed
    - Existing policies will cover the new column
*/

-- Add elevenlabs_agent_id column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_agents' AND column_name = 'elevenlabs_agent_id'
  ) THEN
    ALTER TABLE public.ai_agents 
    ADD COLUMN elevenlabs_agent_id text NULL;

    -- Add comment
    COMMENT ON COLUMN public.ai_agents.elevenlabs_agent_id IS 'Stores the unique ID of the corresponding agent created on the ElevenLabs platform via /v1/convai/agents API.';

    -- Add index for efficient lookups
    CREATE INDEX IF NOT EXISTS idx_ai_agents_elevenlabs_agent_id 
    ON public.ai_agents(elevenlabs_agent_id);
  END IF;
END $$;