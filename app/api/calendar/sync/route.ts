import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import ical from 'node-ical'

async function parseICalEvents(calendarUrl: string) {
  try {
    const events = await ical.async.fromURL(calendarUrl)
    const bookings = []

    for (const key in events) {
      const event = events[key]
      
      if (event.type === 'VEVENT' && event.start && event.end) {
        bookings.push({
          summary: event.summary || 'Unknown Booking',
          start: event.start,
          end: event.end,
          uid: event.uid || key,
          description: event.description || ''
        })
      }
    }

    return bookings
  } catch (error) {
    console.error('Error parsing iCal:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get all properties with calendar URLs
    const { data: properties, error: propertiesError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .not('calendar_url', 'is', null)

    if (propertiesError) {
      throw propertiesError
    }

    let totalSynced = 0

    for (const property of properties || []) {
      try {
        const events = await parseICalEvents(property.calendar_url!)
        
        for (const event of events) {
          // Extract guest information from event summary or description
          const guestName = event.summary.replace(/^\w+\s*[-:]?\s*/, '') || 'Unknown Guest'
          const bookingRef = event.uid.split('@')[0] || event.uid
          
          // Check if booking already exists
          const { data: existingBooking } = await supabaseAdmin
            .from('bookings')
            .select('id')
            .eq('booking_reference', bookingRef)
            .single()

          if (!existingBooking) {
            // Create new booking
            const { error: insertError } = await supabaseAdmin
              .from('bookings')
              .insert({
                property_id: property.id,
                guest_name: guestName,
                guest_email: '', // Would need to be extracted from description or external source
                check_in_date: event.start.toISOString().split('T')[0],
                check_out_date: event.end.toISOString().split('T')[0],
                booking_reference: bookingRef,
                status: 'confirmed'
              })

            if (!insertError) {
              totalSynced++
            }
          }
        }
      } catch (propertyError) {
        console.error(`Error syncing property ${property.id}:`, propertyError)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${totalSynced} new bookings from ${properties?.length || 0} properties`
    })

  } catch (error) {
    console.error('Error syncing calendars:', error)
    return NextResponse.json(
      { error: 'Failed to sync calendars' },
      { status: 500 }
    )
  }
}