/*
  # Fix Database Migration Issues

  1. Changes
    - Add missing unique constraint for user_id in ai_agents table
    - Add missing indexes for call_history
    - Fix call_history status constraint
    - Add missing contact_id reference in call_history
    - Add missing validation constraints

  2. Security
    - Ensure all tables have proper RLS policies
    - Validate existing foreign key constraints
*/

-- Fix ai_agents unique constraint if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_agent'
  ) THEN
    ALTER TABLE public.ai_agents 
    ADD CONSTRAINT unique_user_agent UNIQUE (user_id);
  END IF;
END $$;

-- Add missing contact_id to call_history
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'call_history' AND column_name = 'contact_id'
  ) THEN
    ALTER TABLE public.call_history 
    ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS call_history_contact_id_idx 
    ON public.call_history(contact_id);
  END IF;
END $$;

-- Fix call_history status constraint
DO $$ BEGIN
  ALTER TABLE public.call_history 
  DROP CONSTRAINT IF EXISTS call_history_status_check;

  ALTER TABLE public.call_history 
  ADD CONSTRAINT call_history_status_check 
  CHECK (status = ANY (ARRAY['completed', 'missed', 'failed', 'in-progress', 'requires_review']));
END $$;

-- Add missing indexes for call_history
CREATE INDEX IF NOT EXISTS call_history_status_idx 
ON public.call_history(status);

-- Add missing validation constraints for contacts
DO $$ BEGIN
  -- Only add if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contacts_status_check'
  ) THEN
    ALTER TABLE public.contacts 
    ADD CONSTRAINT contacts_status_check 
    CHECK (status = ANY (ARRAY['new', 'contacted', 'qualified', 'unqualified', 'client']));
  END IF;
END $$;

-- Validate foreign key constraints
DO $$ BEGIN
  -- Validate contacts -> properties FK
  ALTER TABLE public.contacts 
  VALIDATE CONSTRAINT contacts_interested_property_id_fkey;

  -- Validate call_history FKs
  ALTER TABLE public.call_history 
  VALIDATE CONSTRAINT call_history_user_id_fkey;

  ALTER TABLE public.call_history 
  VALIDATE CONSTRAINT call_history_ai_agent_id_fkey;

  ALTER TABLE public.call_history 
  VALIDATE CONSTRAINT call_history_property_id_fkey;

  -- Validate call_tags FKs
  ALTER TABLE public.call_tags 
  VALIDATE CONSTRAINT call_tags_call_id_fkey;

  ALTER TABLE public.call_tags 
  VALIDATE CONSTRAINT call_tags_tag_id_fkey;

  ALTER TABLE public.call_tags 
  VALIDATE CONSTRAINT call_tags_user_id_fkey;
END $$;

-- Ensure RLS is enabled on all tables
DO $$ BEGIN
  ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.call_tags ENABLE ROW LEVEL SECURITY;
END $$;