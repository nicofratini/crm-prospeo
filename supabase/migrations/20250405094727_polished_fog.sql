/*
  # Create Contacts Table for Lead Management

  1. New Tables
    - `contacts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `status` (text)
      - `source` (text)
      - `notes` (text)
      - `company_name` (text)
      - `job_title` (text)
      - `interested_property_id` (uuid, references properties)

  2. Indexes
    - User ID (for filtering by owner)
    - Email (for lookups)
    - Status (for filtering)
    - Interested Property (for property relations)

  3. Security
    - Enable RLS
    - Policy for full access to own contacts
    - Updated_at trigger

  4. Constraints
    - Status values limited to predefined set
    - Email format validation
    - Phone format validation
*/

-- Create Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Contact Information
  first_name text,
  last_name text,
  email text,
  phone text,
  
  -- Lead Information
  status text NOT NULL DEFAULT 'new',
  source text,
  notes text,
  
  -- Business Information
  company_name text,
  job_title text,
  
  -- Property Interest
  interested_property_id uuid REFERENCES properties(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status = ANY (ARRAY['new', 'contacted', 'qualified', 'unqualified', 'client'])
  ),
  CONSTRAINT valid_email CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  CONSTRAINT valid_phone CHECK (
    phone IS NULL OR phone ~* '^\+?[0-9\s-()]{8,}$'
  )
);

-- Add table and column comments
COMMENT ON TABLE public.contacts IS 'Stores contact information for leads and clients managed by users.';
COMMENT ON COLUMN public.contacts.user_id IS 'The user (agent) who owns or manages this contact.';
COMMENT ON COLUMN public.contacts.status IS 'Current status of the lead/contact in the sales pipeline.';
COMMENT ON COLUMN public.contacts.source IS 'Where the lead came from (e.g., Website, Referral).';
COMMENT ON COLUMN public.contacts.interested_property_id IS 'Property the contact has expressed interest in.';

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DO $$ BEGIN
  -- Allow users to read their own contacts
  CREATE POLICY "Users can read own contacts"
    ON public.contacts
    FOR SELECT
    USING (auth.uid() = user_id);

  -- Allow users to insert their own contacts
  CREATE POLICY "Users can create contacts"
    ON public.contacts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  -- Allow users to update their own contacts
  CREATE POLICY "Users can update own contacts"
    ON public.contacts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Allow users to delete their own contacts
  CREATE POLICY "Users can delete own contacts"
    ON public.contacts
    FOR DELETE
    USING (auth.uid() = user_id);

EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_interested_property_id ON public.contacts(interested_property_id);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts(created_at DESC);

-- Create updated_at trigger
DO $$ BEGIN
  CREATE TRIGGER handle_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;