import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Client-side Supabase instance
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Server-side Supabase instance with service role key
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Database types
export interface Owner {
  id: string
  email: string
  name_en: string
  name_ar: string
  phone?: string
  language_preference: 'en' | 'ar'
  hospitable_token?: string
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  owner_id: string
  name_en: string
  name_ar: string
  address: string
  city: string
  airbnb_listing_id?: string
  tuya_device_id?: string
  calendar_url?: string
  current_rank: number
  target_rank: number
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  property_id: string
  guest_name: string
  guest_email: string
  guest_phone?: string
  check_in_date: string
  check_out_date: string
  booking_reference: string
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
  smart_lock_pin?: string
  pin_expires_at?: string
  deposit_amount: number
  deposit_paid: boolean
  contract_signed: boolean
  created_at: string
  updated_at: string
  property?: Property
}

export interface CleaningTask {
  id: string
  property_id: string
  booking_id?: string
  cleaner_id?: string
  title_en: string
  title_ar: string
  description_en?: string
  description_ar?: string
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'verified'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  scheduled_date?: string
  completed_date?: string
  notion_task_id?: string
  photos_required: boolean
  photos_uploaded: string[]
  estimated_duration: number
  actual_duration?: number
  created_at: string
  updated_at: string
  property?: Property
  cleaner?: {
    name_en: string
    name_ar: string
    phone: string
  }
}

export interface AIEdit {
  id: string
  property_id: string
  title_en: string
  title_ar: string
  bullets_en: string[]
  bullets_ar: string[]
  suggested_price: number
  current_rank: number
  target_rank: number
  competitor_analysis: Record<string, any>
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  ai_confidence_score: number
  created_by: string
  applied_at?: string
  created_at: string
  property?: Property
}

export interface PricingData {
  id: string
  property_id: string
  date: string
  suggested_price: number
  competitor_avg_price?: number
  occupancy_rate?: number
  adr?: number
  market_demand?: 'low' | 'medium' | 'high'
  source: 'pricelabs' | 'airbnb' | 'manual'
  created_at: string
}