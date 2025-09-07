import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import TelegramBot from 'node-telegram-bot-api'

// Initialize Telegram Bot
const bot = process.env.TELEGRAM_BOT_TOKEN 
  ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN)
  : null

// Simulate Notion API integration
async function createNotionTask(task: any): Promise<string> {
  // In a real implementation, this would create a task in Notion
  console.log('Creating Notion task:', task)
  
  // Simulate API call delay and return a mock task ID
  await new Promise(resolve => setTimeout(resolve, 1000))
  return `notion_task_${Date.now()}`
}

async function sendTelegramNotification(chatId: string, message: string): Promise<void> {
  if (!bot) {
    console.log('Telegram bot not configured')
    return
  }

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' })
  } catch (error) {
    console.error('Error sending Telegram message:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId, trigger } = await request.json()

    if (!bookingId || !trigger) {
      return NextResponse.json(
        { error: 'Booking ID and trigger are required' },
        { status: 400 }
      )
    }

    // Get booking and property details
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

    // Create cleaning task
    const taskData = {
      property_id: booking.property_id,
      booking_id: booking.id,
      title_en: `Post-checkout cleaning - ${booking.property?.name_en}`,
      title_ar: `تنظيف ما بعد المغادرة - ${booking.property?.name_ar}`,
      description_en: `Clean property after guest checkout. Guest: ${booking.guest_name}, Checkout: ${booking.check_out_date}`,
      description_ar: `تنظيف العقار بعد مغادرة النزيل. النزيل: ${booking.guest_name}، المغادرة: ${booking.check_out_date}`,
      status: 'pending',
      priority: 'high',
      scheduled_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      photos_required: true,
      estimated_duration: 180 // 3 hours
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from('cleaning_tasks')
      .insert(taskData)
      .select()
      .single()

    if (taskError) {
      throw taskError
    }

    // Create Notion task
    const notionTaskId = await createNotionTask({
      title: taskData.title_en,
      description: taskData.description_en,
      property: booking.property?.name_en,
      dueDate: taskData.scheduled_date,
      priority: taskData.priority
    })

    // Update task with Notion ID
    await supabaseAdmin
      .from('cleaning_tasks')
      .update({ notion_task_id: notionTaskId })
      .eq('id', task.id)

    // Get available cleaners
    const { data: cleaners, error: cleanersError } = await supabaseAdmin
      .from('cleaners')
      .select('*')
      .eq('is_active', true)

    if (!cleanersError && cleaners && cleaners.length > 0) {
      // Send Telegram notifications to available cleaners
      for (const cleaner of cleaners) {
        if (cleaner.telegram_chat_id) {
          const message = `
🧹 <b>New Cleaning Task</b>

📍 <b>Property:</b> ${booking.property?.name_en}
👤 <b>Guest:</b> ${booking.guest_name}
📅 <b>Scheduled:</b> ${new Date(taskData.scheduled_date).toLocaleString()}
⏱️ <b>Estimated Duration:</b> ${taskData.estimated_duration / 60} hours
🔥 <b>Priority:</b> ${taskData.priority.toUpperCase()}

📝 <b>Description:</b>
${taskData.description_en}

Click to accept this task: /accept_${task.id}
          `

          await sendTelegramNotification(cleaner.telegram_chat_id, message)
        }
      }
    }

    // Update booking status
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'checked_out' })
      .eq('id', booking.id)

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: taskData.title_en,
        scheduled_date: taskData.scheduled_date,
        notion_task_id: notionTaskId
      }
    })

  } catch (error) {
    console.error('Error creating cleaning task:', error)
    return NextResponse.json(
      { error: 'Failed to create cleaning task' },
      { status: 500 }
    )
  }
}