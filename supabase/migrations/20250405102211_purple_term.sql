/*
  # Schema update for core features

  1. New Tables
    - `properties`
      - Basic property information (name, address, type, status, price)
      - Links to user (owner/manager)
      - Includes validation for property types and status
    
    - `ai_agents`
      - One AI agent configuration per user
      - Stores voice ID and system prompt
      - Enforces one agent per user constraint
    
    - `tags`
      - User-defined tags for categorizing content
      - Includes optional color field for UI
      - Ensures unique tag names per user
    
    - `call_history`
      - Records all calls and their analysis
      - Links to properties, contacts, and AI agents
      - Stores transcripts and analysis results
    
    - `call_tags`
      - Junction table for call categorization
      - Links calls to tags with user context
      - Includes assignment timestamp

  2. Security
    - RLS enabled on all tables
    - Appropriate policies for user data access
    - Updated_at triggers where needed

  3. Relationships
    - properties -> users (N:1)
    - ai_agents -> users (1:1)
    - tags -> users (N:1)
    - call_history -> users, properties, contacts, ai_agents (N:1)
    - call_tags -> calls, tags (N:N)
*/

-- Create Properties Table
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Basic Information
  name text NOT NULL,
  address text,
  property_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  price numeric,
  description text,

  -- Constraints
  CONSTRAINT valid_property_type CHECK (
    property_type = ANY (ARRAY['Maison', 'Appartement'])
  ),
  CONSTRAINT valid_status CHECK (
    status = ANY (ARRAY['active', 'inactive', 'sold'])
  )
);

COMMENT ON TABLE public.properties IS 'Stores real estate properties managed by users.';
COMMENT ON COLUMN public.properties.user_id IS 'The user who owns/manages this property.';
COMMENT ON COLUMN public.properties.name IS 'Property name or title.';
COMMENT ON COLUMN public.properties.property_type IS 'Type of property (e.g., Maison, Appartement).';
COMMENT ON COLUMN public.properties.status IS 'Current status of the property.';
COMMENT ON COLUMN public.properties.price IS 'Property price.';

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Properties RLS Policies
CREATE POLICY "Users can read own properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create properties"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own properties"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own properties"
  ON public.properties FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX properties_user_id_idx ON public.properties(user_id);
CREATE INDEX properties_property_type_idx ON public.properties(property_type);
CREATE INDEX properties_status_idx ON public.properties(status);

-- Create AI Agents Table
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  agent_name text,
  elevenlabs_voice_id text NOT NULL,
  system_prompt text,

  CONSTRAINT unique_user_agent UNIQUE (user_id)
);

COMMENT ON TABLE public.ai_agents IS 'Stores configuration for the AI agent associated with each user.';

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- AI Agents RLS Policies
CREATE POLICY "Users can read own agent"
  ON public.ai_agents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agent"
  ON public.ai_agents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent"
  ON public.ai_agents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX ai_agents_user_id_idx ON public.ai_agents(user_id);

-- Create Tags Table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT tags_user_id_name_key UNIQUE (user_id, name)
);

COMMENT ON TABLE public.tags IS 'Stores user-defined tags for classifying calls or other items.';

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Tags RLS Policies
CREATE POLICY "Users can manage their own tags"
  ON public.tags FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tags_user_id ON public.tags(user_id);

-- Create Call History Table
CREATE TABLE public.call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
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
    status = ANY (ARRAY['completed', 'missed', 'failed', 'in-progress', 'requires_review'])
  )
);

COMMENT ON TABLE public.call_history IS 'Records history and analysis of calls handled by the AI or user.';
COMMENT ON COLUMN public.call_history.transcript IS 'Stores the call transcript as a structured JSONB object with segments containing speaker, text, and timestamps';

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Call History RLS Policies
CREATE POLICY "Users can read own calls"
  ON public.call_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX call_history_user_id_idx ON public.call_history(user_id);
CREATE INDEX call_history_ai_agent_id_idx ON public.call_history(ai_agent_id);
CREATE INDEX call_history_property_id_idx ON public.call_history(property_id);
CREATE INDEX call_history_contact_id_idx ON public.call_history(contact_id);
CREATE INDEX call_history_call_timestamp_idx ON public.call_history(call_timestamp);
CREATE INDEX call_history_status_idx ON public.call_history(status);

-- Create Call Tags Junction Table
CREATE TABLE public.call_tags (
  call_id uuid NOT NULL REFERENCES public.call_history(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (call_id, tag_id)
);

COMMENT ON TABLE public.call_tags IS 'Junction table linking calls with their assigned tags.';

ALTER TABLE public.call_tags ENABLE ROW LEVEL SECURITY;

-- Call Tags RLS Policies
CREATE POLICY "Users can manage tags on their own calls"
  ON public.call_tags FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_call_tags_call_id ON public.call_tags(call_id);
CREATE INDEX idx_call_tags_tag_id ON public.call_tags(tag_id);
CREATE INDEX idx_call_tags_user_id ON public.call_tags(user_id);

-- Create updated_at triggers for all tables
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_call_history_updated_at
  BEFORE UPDATE ON public.call_history
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();