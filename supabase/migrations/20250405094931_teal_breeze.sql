/*
  # Create Properties Table for Real Estate Management

  1. New Tables
    - `properties`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `address` (text)
      - `property_type` (text)
      - `status` (text)
      - `price` (numeric)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - User ID (for filtering by owner)
    - Property Type (for filtering)
    - Status (for filtering)

  3. Security
    - Enable RLS
    - Policies for authenticated users
    - Updated_at trigger

  4. Constraints
    - Property type limited to predefined set
    - Status limited to predefined set
*/

-- Create Properties Table
CREATE TABLE IF NOT EXISTS public.properties (
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

-- Add table and column comments
COMMENT ON TABLE public.properties IS 'Stores real estate properties managed by users.';
COMMENT ON COLUMN public.properties.user_id IS 'The user who owns/manages this property.';
COMMENT ON COLUMN public.properties.name IS 'Property name or title.';
COMMENT ON COLUMN public.properties.property_type IS 'Type of property (e.g., Maison, Appartement).';
COMMENT ON COLUMN public.properties.status IS 'Current status of the property.';
COMMENT ON COLUMN public.properties.price IS 'Property price.';

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DO $$ BEGIN
  -- Allow authenticated users to read own properties
  CREATE POLICY "Users can read own properties"
    ON public.properties
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  -- Allow authenticated users to create properties
  CREATE POLICY "Users can create properties"
    ON public.properties
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  -- Allow authenticated users to update own properties
  CREATE POLICY "Users can update own properties"
    ON public.properties
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Allow authenticated users to delete own properties
  CREATE POLICY "Users can delete own properties"
    ON public.properties
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create Indexes
CREATE INDEX IF NOT EXISTS properties_user_id_idx ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS properties_property_type_idx ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS properties_status_idx ON public.properties(status);

-- Create updated_at trigger
DO $$ BEGIN
  CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;