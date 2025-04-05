/*
  # Create Profiles Table and Related Functions

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `updated_at` (timestamptz)
      - `full_name` (text)
      - `avatar_url` (text)
      - `onboarding_completed` (boolean, default false)

  2. Functions & Triggers
    - `handle_new_user()`: Creates profile entry when new user signs up
    - `update_updated_at_column()`: Updates timestamp on profile changes
    - Trigger `on_auth_user_created`: Links to handle_new_user
    - Trigger `handle_profiles_updated_at`: Links to update_updated_at_column

  3. Security
    - Enable RLS on profiles table
    - Policies:
      - Allow users to read their own profile
      - Allow users to update their own profile
      - No direct insert policy (handled by trigger)
*/

-- Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz DEFAULT now(),
  full_name text,
  avatar_url text,
  onboarding_completed boolean NOT NULL DEFAULT false
);

-- Add table and column comments
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN public.profiles.updated_at IS 'Last update timestamp for the profile';
COMMENT ON COLUMN public.profiles.full_name IS 'User''s full name';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user''s avatar image';
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Indicates if the user has completed onboarding';

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DO $$ BEGIN
  -- Allow users to read their own profile
  CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

  -- Allow users to update their own profile
  CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create profile creation trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- Create triggers
DO $$ BEGIN
  -- Trigger for updating updated_at timestamp
  CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

  -- Trigger for creating profile on user signup
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;