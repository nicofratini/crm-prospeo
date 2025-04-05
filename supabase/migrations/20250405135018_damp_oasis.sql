/*
  # Properties Table Setup
  
  1. Changes
    - Create properties table if not exists
    - Add property type and status constraints
    - Add foreign key to users
    - Create indexes
    - Enable RLS with policies
    - Add triggers and comments
    
  2. Safety
    - All operations use IF EXISTS/IF NOT EXISTS
    - Constraints are dropped before recreation
    - Indexes use IF NOT EXISTS
*/

-- Create properties table with IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  property_type text,
  status text DEFAULT 'active'::text,
  price numeric,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Drop existing constraints if they exist
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS valid_property_type,
  DROP CONSTRAINT IF EXISTS valid_status,
  DROP CONSTRAINT IF EXISTS properties_user_id_fkey;

-- Add property type constraint
ALTER TABLE public.properties
  ADD CONSTRAINT valid_property_type
  CHECK (property_type = ANY (ARRAY['Maison'::text, 'Appartement'::text]));

-- Add status constraint
ALTER TABLE public.properties
  ADD CONSTRAINT valid_status
  CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'sold'::text]));

-- Add foreign key to users
ALTER TABLE public.properties
  ADD CONSTRAINT properties_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'properties_property_type_idx') THEN
        CREATE INDEX properties_property_type_idx ON public.properties(property_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'properties_status_idx') THEN
        CREATE INDEX properties_status_idx ON public.properties(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'properties_user_id_idx') THEN
        CREATE INDEX properties_user_id_idx ON public.properties(user_id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own properties" ON public.properties;

-- Create RLS policies
CREATE POLICY "Users can manage their own properties"
  ON public.properties
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;

-- Create updated_at trigger
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.properties IS 'Stores real estate properties managed by users.';
COMMENT ON COLUMN public.properties.user_id IS 'The user who owns/manages this property.';
COMMENT ON COLUMN public.properties.name IS 'Property name or title.';
COMMENT ON COLUMN public.properties.property_type IS 'Type of property (e.g., Maison, Appartement).';
COMMENT ON COLUMN public.properties.status IS 'Current status of the property.';
COMMENT ON COLUMN public.properties.price IS 'Property price.';