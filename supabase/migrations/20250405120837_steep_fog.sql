/*
  # Create Appointments Table

  1. New Tables
    - `appointments`
      - Core fields:
        - `id` (uuid, primary key)
        - `user_id` (uuid, references users)
        - `contact_id` (uuid, references contacts)
        - `property_id` (uuid, references properties)
        - `created_at`, `updated_at` (timestamptz)
      - Appointment details:
        - `title` (text)
        - `description` (text)
        - `start_time` (timestamptz)
        - `end_time` (timestamptz)
        - `status` (text)
        - `type` (text)
        - `location` (text)
      - Cal.com integration:
        - `calcom_booking_id` (text, unique)
        - `calcom_event_type_id` (text)
        - `attendee_name` (text)
        - `attendee_email` (text)

  2. Security
    - Enable RLS
    - No direct RLS policies (Edge Function access)
    - Updated_at trigger

  3. Indexes
    - user_id (filtering by owner)
    - contact_id (contact relations)
    - property_id (property relations)
    - start_time (date filtering)
    - calcom_booking_id (unique lookups)
*/

-- Create Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Appointment Details
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  type text NOT NULL DEFAULT 'visit', -- visit, call, signing, etc.
  location text,

  -- Cal.com Integration
  calcom_booking_id text UNIQUE,
  calcom_event_type_id text,
  attendee_name text,
  attendee_email text,

  -- Constraints
  CONSTRAINT valid_appointment_status CHECK (
    status = ANY (ARRAY['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled'])
  ),
  CONSTRAINT valid_appointment_type CHECK (
    type = ANY (ARRAY['visit', 'call', 'signing', 'valuation', 'other'])
  ),
  CONSTRAINT valid_appointment_times CHECK (
    start_time < end_time
  )
);

-- Add comments
COMMENT ON TABLE public.appointments IS 'Stores appointment/meeting details for contacts and properties.';
COMMENT ON COLUMN public.appointments.calcom_booking_id IS 'Unique booking ID from Cal.com if integrated.';
COMMENT ON COLUMN public.appointments.type IS 'Type of appointment (visit, call, signing, etc.).';
COMMENT ON COLUMN public.appointments.status IS 'Current status of the appointment.';

-- Enable RLS (access controlled via Edge Functions)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_contact_id ON public.appointments(contact_id);
CREATE INDEX IF NOT EXISTS idx_appointments_property_id ON public.appointments(property_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_calcom_booking_id ON public.appointments(calcom_booking_id);

-- Create updated_at trigger
DO $$ BEGIN
  CREATE TRIGGER handle_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;