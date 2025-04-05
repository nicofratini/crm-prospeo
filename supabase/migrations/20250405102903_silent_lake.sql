/*
  # Fix User References and Remove Profiles Table

  1. Changes
    - Drop redundant profiles table
    - Add avatar_url to users table if missing
    - Update all foreign keys to reference public.users instead of auth.users
    - Remove RLS policies that depend on auth.uid()

  2. Tables Modified
    - Drop: profiles
    - Modify FK: properties, contacts, ai_agents, tags, call_history, call_tags
    - Add Column: users (avatar_url)

  3. Security
    - Remove auth.uid() based RLS policies
    - Tables will use Edge Function-based access control
*/

-- First, ensure we have the avatar_url column in users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Drop profiles table and related objects
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles;

-- Update foreign key references in properties
ALTER TABLE public.properties 
  DROP CONSTRAINT IF EXISTS properties_user_id_fkey;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update foreign key references in contacts
ALTER TABLE public.contacts 
  DROP CONSTRAINT IF EXISTS contacts_user_id_fkey;
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update foreign key references in ai_agents
ALTER TABLE public.ai_agents 
  DROP CONSTRAINT IF EXISTS ai_agents_user_id_fkey;
ALTER TABLE public.ai_agents
  ADD CONSTRAINT ai_agents_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update foreign key references in tags
ALTER TABLE public.tags 
  DROP CONSTRAINT IF EXISTS tags_user_id_fkey;
ALTER TABLE public.tags
  ADD CONSTRAINT tags_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update foreign key references in call_history
ALTER TABLE public.call_history 
  DROP CONSTRAINT IF EXISTS call_history_user_id_fkey;
ALTER TABLE public.call_history
  ADD CONSTRAINT call_history_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update foreign key references in call_tags
ALTER TABLE public.call_tags 
  DROP CONSTRAINT IF EXISTS call_tags_user_id_fkey;
ALTER TABLE public.call_tags
  ADD CONSTRAINT call_tags_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Remove auth.uid() based RLS policies
DROP POLICY IF EXISTS "Users can read own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can create properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

DROP POLICY IF EXISTS "Users can read own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;

DROP POLICY IF EXISTS "Users can read own agent" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can create own agent" ON public.ai_agents;
DROP POLICY IF EXISTS "Users can update own agent" ON public.ai_agents;

DROP POLICY IF EXISTS "Users can manage their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can read own calls" ON public.call_history;
DROP POLICY IF EXISTS "Users can manage tags on their own calls" ON public.call_tags;

-- Keep RLS enabled but without policies (access control via Edge Functions)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_tags ENABLE ROW LEVEL SECURITY;