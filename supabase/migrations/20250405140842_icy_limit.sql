/*
  # Add Admin Role to Users

  1. Changes
    - Add `is_admin` boolean column to users table
    - Add comment explaining the column's purpose
    - Create function to check admin status
    - Create helper view for admin user listing
    
  2. Security
    - Default value of false for is_admin
    - Column is NOT NULL to prevent ambiguity
    - Helper function runs with SECURITY DEFINER
    - View access controlled via function check
*/

-- Add is_admin column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'is_admin'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

    -- Add comment
    COMMENT ON COLUMN public.users.is_admin IS 'Flags whether the user has administrative privileges within the Prospeo application.';
  END IF;
END $$;

-- Create or replace function to check if a user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_admin FROM users WHERE id = user_id;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.is_admin(uuid) IS 'Checks if a given user has admin privileges.';

-- Create a secure function to get user list (admin only)
CREATE OR REPLACE FUNCTION public.get_user_list()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  created_at timestamptz,
  updated_at timestamptz,
  last_login timestamptz,
  is_admin boolean,
  onboarding_completed boolean,
  has_ai_agent boolean,
  property_count bigint,
  contact_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: User is not an administrator';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.name,
    u.created_at,
    u.updated_at,
    u.last_login,
    u.is_admin,
    u.onboarding_completed,
    EXISTS(SELECT 1 FROM ai_agents a WHERE a.user_id = u.id) as has_ai_agent,
    (SELECT COUNT(*) FROM properties p WHERE p.user_id = u.id) as property_count,
    (SELECT COUNT(*) FROM contacts c WHERE c.user_id = u.id) as contact_count
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.get_user_list() IS 'Returns a list of all users with their statistics. Only accessible by administrators.';

-- Create index for efficient admin checks
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);