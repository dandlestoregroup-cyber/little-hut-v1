import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Simulate Tuya Cloud API integration
async function generateTuyaPin(deviceId: string): Promise<string> {
  // In a real implementation, this would call the Tuya Cloud API
  // For demo purposes, we'll generate a random 6-digit PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString()
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return pin
}

async function setTuyaPinExpiration(deviceId: string, pin: string, expirationDate: Date): Promise<void> {
  // In a real implementation, this would set the PIN expiration in Tuya Cloud
  console.log(`Setting PIN ${pin} for device ${deviceId} to expire at ${expirationDate}`)
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500))
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (!booking.property?.tuya_device_id) {
      return NextResponse.json(
        { error: 'Smart lock device not configured for this property' },
        { status: 400 }
      )
    }

    // Generate new PIN via Tuya Cloud API
    const pin = await generateTuyaPin(booking.property.tuya_device_id)

    // Calculate PIN expiration (2 hours after checkout)
    const checkoutDate = new Date(booking.check_out_date)
    const pinExpiration = new Date(checkoutDate.getTime() + 2 * 60 * 60 * 1000)

    // Set PIN expiration in Tuya Cloud
    await setTuyaPinExpiration(booking.property.tuya_device_id, pin, pinExpiration)

    // Update booking with new PIN
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        smart_lock_pin: pin,
        pin_expires_at: pinExpiration.toISOString()
      })
      .eq('id', bookingId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      pin: pin,
      expiresAt: pinExpiration.toISOString()
    })

  } catch (error) {
    console.error('Error generating smart lock PIN:', error)
    return NextResponse.json(
      { error: 'Failed to generate smart lock PIN' },
      { status: 500 }
    )
  }
}