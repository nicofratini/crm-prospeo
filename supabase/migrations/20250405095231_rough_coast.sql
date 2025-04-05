/*
  # Create AI Agents, Call History, and Tags Tables

  1. New Tables
    - `ai_agents`
      - One AI agent configuration per user
      - Stores voice ID and system prompt
    - `call_history`
      - Records all calls and their analysis
      - Links to properties and contacts
    - `tags`
      - User-defined tags for categorizing calls
    - `call_tags`
      - Junction table linking calls to tags

  2. Security
    - Enable RLS on all tables
    - Appropriate policies for each table
    - Updated_at triggers where needed

  3. Relationships
    - ai_agents -> users (1:1)
    - call_history -> users, properties, contacts (N:1)
    - tags -> users (N:1)
    - call_tags -> calls, tags (N:N)
*/

-- Create AI Agents Table
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  agent_name text,
  elevenlabs_voice_id text NOT NULL,
  system_prompt text,

  CONSTRAINT unique_user_agent UNIQUE (user_id)
);

-- Add comments
COMMENT ON TABLE public.ai_agents IS 'Stores configuration for the AI agent associated with each user.';

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for ai_agents
DO $$ BEGIN
  -- Allow users to read their own agent
  CREATE POLICY "Users can read own agent"
    ON public.ai_agents
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  -- Allow users to create their own agent
  CREATE POLICY "Users can create own agent"
    ON public.ai_agents
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  -- Allow users to update their own agent
  CREATE POLICY "Users can update own agent"
    ON public.ai_agents
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS ai_agents_user_id_idx ON public.ai_agents(user_id);

-- Create updated_at trigger
DO $$ BEGIN
  CREATE TRIGGER update_ai_agents_updated_at
    BEFORE UPDATE ON public.ai_agents
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create Call History Table
CREATE TABLE IF NOT EXISTS public.call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  caller_number text NOT NULL,
  call_timestamp timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer,
  status text NOT NULL DEFAULT 'completed',
  recording_url text,
  summary text,
  transcript jsonb,

  CONSTRAINT call_history_status_check CHECK (
    status = ANY (ARRAY['completed', 'missed', 'failed', 'in-progress'])
  )
);

-- Add comments
COMMENT ON TABLE public.call_history IS 'Records history and analysis of calls handled by the AI or user.';
COMMENT ON COLUMN public.call_history.transcript IS 'Stores the call transcript as a structured JSONB object with segments containing speaker, text, and timestamps';

-- Enable RLS
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for call_history
DO $$ BEGIN
  -- Allow users to read their own calls
  CREATE POLICY "Users can read own calls"
    ON public.call_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS call_history_user_id_idx ON public.call_history(user_id);
CREATE INDEX IF NOT EXISTS call_history_ai_agent_id_idx ON public.call_history(ai_agent_id);
CREATE INDEX IF NOT EXISTS call_history_property_id_idx ON public.call_history(property_id);
CREATE INDEX IF NOT EXISTS call_history_call_timestamp_idx ON public.call_history(call_timestamp);

-- Create updated_at trigger
DO $$ BEGIN
  CREATE TRIGGER update_call_history_updated_at
    BEFORE UPDATE ON public.call_history
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.tags IS 'Stores user-defined tags for classifying calls or other items.';

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for tags
DO $$ BEGIN
  -- Allow users to manage their own tags
  CREATE POLICY "Users can manage their own tags"
    ON public.tags
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create unique constraint for tag names per user
ALTER TABLE public.tags ADD CONSTRAINT tags_user_id_name_key UNIQUE (user_id, name);

-- Create index
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);

-- Create Call Tags Junction Table
CREATE TABLE IF NOT EXISTS public.call_tags (
  call_id uuid NOT NULL REFERENCES public.call_history(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (call_id, tag_id)
);

-- Add comments
COMMENT ON TABLE public.call_tags IS 'Junction table linking calls with their assigned tags.';

-- Enable RLS
ALTER TABLE public.call_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for call_tags
DO $$ BEGIN
  -- Allow users to manage tags on their own calls
  CREATE POLICY "Users can manage tags on their own calls"
    ON public.call_tags
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_tags_call_id ON public.call_tags(call_id);
CREATE INDEX IF NOT EXISTS idx_call_tags_tag_id ON public.call_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_call_tags_user_id ON public.call_tags(user_id);