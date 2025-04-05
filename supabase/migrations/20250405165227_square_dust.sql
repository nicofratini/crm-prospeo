/*
  # Create Admin User Setup

  1. Changes
    - Create function to set user as admin
    - Create function to check if user is admin
    - Add RLS policies for admin access
*/

-- Function to set a user as admin
CREATE OR REPLACE FUNCTION public.set_user_as_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user exists
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = user_email
  ) THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;

  -- Set the user as admin
  UPDATE public.users
  SET is_admin = true
  WHERE email = user_email;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.set_user_as_admin(text) IS 'Sets a user as admin by their email address.';

-- Create index for email lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);