/*
  # AzhaBoost Property Management System Database Schema

  1. New Tables
    - `owners` - Property owner information and credentials
    - `properties` - Property details and configurations
    - `bookings` - Guest booking information and status
    - `cleaners` - Cleaner profiles and contact information
    - `cleaning_tasks` - Cleaning task management and status tracking
    - `ai_edits` - AI-generated listing optimizations
    - `pricing_data` - Historical pricing and market data
    - `smart_locks` - Smart lock configurations and PIN management

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Create service role policies for system operations

  3. Features
    - Multi-language support with Arabic and English fields
    - Automated task scheduling and status tracking
    - AI-powered listing optimization workflow
    - Smart lock PIN management with expiration
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Owners table
CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  phone text,
  language_preference text DEFAULT 'en' CHECK (language_preference IN ('en', 'ar')),
  hospitable_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  address text NOT NULL,
  city text DEFAULT 'Azha' NOT NULL,
  airbnb_listing_id text,
  tuya_device_id text,
  calendar_url text,
  current_rank integer DEFAULT 0,
  target_rank integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  booking_reference text NOT NULL,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled')),
  smart_lock_pin text,
  pin_expires_at timestamptz,
  deposit_amount decimal(10,2) DEFAULT 0,
  deposit_paid boolean DEFAULT false,
  contract_signed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cleaners table
CREATE TABLE IF NOT EXISTS cleaners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en text NOT NULL,
  name_ar text NOT NULL,
  phone text NOT NULL,
  telegram_chat_id text,
  is_active boolean DEFAULT true,
  hourly_rate decimal(8,2) DEFAULT 25.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cleaning tasks table
CREATE TABLE IF NOT EXISTS cleaning_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  cleaner_id uuid REFERENCES cleaners(id) ON DELETE SET NULL,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  description_en text,
  description_ar text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'verified')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scheduled_date timestamptz,
  completed_date timestamptz,
  notion_task_id text,
  photos_required boolean DEFAULT true,
  photos_uploaded jsonb DEFAULT '[]',
  estimated_duration integer DEFAULT 180, -- minutes
  actual_duration integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI edits table
CREATE TABLE IF NOT EXISTS ai_edits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  bullets_en jsonb NOT NULL DEFAULT '[]',
  bullets_ar jsonb NOT NULL DEFAULT '[]',
  suggested_price decimal(8,2) NOT NULL,
  current_rank integer NOT NULL,
  target_rank integer NOT NULL,
  competitor_analysis jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  ai_confidence_score decimal(3,2) DEFAULT 0.85,
  created_by text DEFAULT 'ai_ranking_engine',
  applied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Pricing data table
CREATE TABLE IF NOT EXISTS pricing_data (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date date NOT NULL,
  suggested_price decimal(8,2) NOT NULL,
  competitor_avg_price decimal(8,2),
  occupancy_rate decimal(5,2),
  adr decimal(8,2), -- Average Daily Rate
  market_demand text CHECK (market_demand IN ('low', 'medium', 'high')),
  source text DEFAULT 'pricelabs' CHECK (source IN ('pricelabs', 'airbnb', 'manual')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(property_id, date)
);

-- Smart locks table
CREATE TABLE IF NOT EXISTS smart_locks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  device_id text NOT NULL UNIQUE,
  device_name text NOT NULL,
  battery_level integer DEFAULT 100,
  is_online boolean DEFAULT true,
  last_activity timestamptz DEFAULT now(),
  firmware_version text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_locks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for owners
CREATE POLICY "Owners can read own data"
  ON owners FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Owners can update own data"
  ON owners FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- RLS Policies for properties
CREATE POLICY "Owners can manage their properties"
  ON properties FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- RLS Policies for bookings
CREATE POLICY "Property owners can manage bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for cleaning_tasks
CREATE POLICY "Property owners can manage cleaning tasks"
  ON cleaning_tasks FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for ai_edits
CREATE POLICY "Property owners can manage AI edits"
  ON ai_edits FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

-- Service role policies (for system operations)
CREATE POLICY "Service role can manage all data"
  ON owners FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage all properties"
  ON properties FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage all bookings"
  ON bookings FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage all cleaning tasks"
  ON cleaning_tasks FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage all AI edits"
  ON ai_edits FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage all pricing data"
  ON pricing_data FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage all smart locks"
  ON smart_locks FOR ALL
  TO service_role
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_property_id ON cleaning_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_status ON cleaning_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_edits_property_id ON ai_edits(property_id);
CREATE INDEX IF NOT EXISTS idx_ai_edits_status ON ai_edits(status);
CREATE INDEX IF NOT EXISTS idx_pricing_data_property_date ON pricing_data(property_id, date);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cleaners_updated_at BEFORE UPDATE ON cleaners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cleaning_tasks_updated_at BEFORE UPDATE ON cleaning_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smart_locks_updated_at BEFORE UPDATE ON smart_locks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();