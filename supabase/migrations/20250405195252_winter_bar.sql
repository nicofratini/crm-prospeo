/*
  # Refactor AI Agents for Sharing

  1. Changes
    - Modify ai_agents table to support sharing
    - Create user_assigned_agents junction table
    - Update RLS policies and constraints
    - Remove old triggers and functions
    
  2. Security
    - Enable RLS on all tables
    - Proper policies for access control
    - Service Role access for admin operations
*/

-- 1. Modify ai_agents table
DO $$ BEGIN
  -- Rename user_id to owner_user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_agents' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.ai_agents 
    RENAME COLUMN user_id TO owner_user_id;
  END IF;

  -- Drop unique constraint if it exists
  ALTER TABLE public.ai_agents 
  DROP CONSTRAINT IF EXISTS unique_user_agent;

  -- Add new columns
  ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text;

  -- Update foreign key to reference owner_user_id
  ALTER TABLE public.ai_agents
  DROP CONSTRAINT IF EXISTS ai_agents_user_id_fkey;

  ALTER TABLE public.ai_agents
  ADD CONSTRAINT ai_agents_owner_user_id_fkey 
  FOREIGN KEY (owner_user_id) 
  REFERENCES auth.users(id) ON DELETE CASCADE;

END $$;

-- Update comments
COMMENT ON TABLE public.ai_agents IS 'Stores AI agent configurations that can be shared between users.';
COMMENT ON COLUMN public.ai_agents.owner_user_id IS 'ID of the user (typically admin) who owns and manages this agent configuration.';
COMMENT ON COLUMN public.ai_agents.is_shared IS 'If true, this agent configuration can be selected by standard users.';
COMMENT ON COLUMN public.ai_agents.description IS 'A short description of the agent, visible to users during selection.';

-- 2. Create user_assigned_agents junction table
CREATE TABLE IF NOT EXISTS public.user_assigned_agents (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  -- One agent per user
  PRIMARY KEY (user_id)
);

-- Add comments
COMMENT ON TABLE public.user_assigned_agents IS 'Links users to their selected AI agent configuration.';
COMMENT ON COLUMN public.user_assigned_agents.user_id IS 'The user who is assigned this agent configuration.';
COMMENT ON COLUMN public.user_assigned_agents.assigned_agent_id IS 'The AI agent configuration assigned to this user.';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_assigned_agents_user_id ON public.user_assigned_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_assigned_agents_agent_id ON public.user_assigned_agents(assigned_agent_id);

-- 3. Update RLS policies

-- Enable RLS on both tables
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assigned_agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own agent" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can create own agent" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can update own agent" ON public.ai_agents;

-- Create new policies for ai_agents
CREATE POLICY "Allow users to read shared agents"
  ON public.ai_agents
  FOR SELECT
  TO authenticated
  USING (is_shared = true OR owner_user_id = auth.uid());

-- Create policies for user_assigned_agents
CREATE POLICY "Users can manage their own agent assignment"
  ON public.user_assigned_agents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Remove old triggers and functions
DROP TRIGGER IF EXISTS on_user_confirmed_create_agent ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_create_agent_placeholder();

-- 5. Create helper function to get a user's current agent
CREATE OR REPLACE FUNCTION public.get_user_agent(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  agent_name text,
  elevenlabs_voice_id text,
  elevenlabs_agent_id text,
  system_prompt text,
  description text,
  is_shared boolean,
  owner_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.*
  FROM public.ai_agents a
  JOIN public.user_assigned_agents ua ON ua.assigned_agent_id = a.id
  WHERE ua.user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_agent(uuid) IS 'Returns the AI agent configuration currently assigned to a user.';

-- 6. Create function to assign an agent to a user
CREATE OR REPLACE FUNCTION public.assign_agent_to_user(
  p_user_id uuid,
  p_agent_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the agent exists and is shared (or user is owner)
  IF NOT EXISTS (
    SELECT 1 FROM public.ai_agents
    WHERE id = p_agent_id 
    AND (is_shared = true OR owner_user_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'Agent not found or not available for assignment';
  END IF;

  -- Insert or update the assignment
  INSERT INTO public.user_assigned_agents (user_id, assigned_agent_id)
  VALUES (p_user_id, p_agent_id)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    assigned_agent_id = EXCLUDED.assigned_agent_id,
    assigned_at = now();
END;
$$;

COMMENT ON FUNCTION public.assign_agent_to_user(uuid, uuid) IS 'Assigns an AI agent configuration to a user, replacing any existing assignment.';