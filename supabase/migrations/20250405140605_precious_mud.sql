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
    - Careful RLS consideration for admin access
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

-- Create a secure view for listing users (admin access)
CREATE OR REPLACE VIEW public.admin_user_list AS
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
FROM public.users u;

-- Secure the view with RLS
ALTER VIEW public.admin_user_list SET (security_invoker = true);

-- Create policy for admin access to the view
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view all users" ON public.admin_user_list;
  
  CREATE POLICY "Admins can view all users"
    ON public.admin_user_list
    FOR SELECT
    TO authenticated
    USING (
      is_admin(auth.uid())
    );
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Create index for efficient admin checks
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);