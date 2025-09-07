'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KPICard } from '@/components/Dashboard/KPICard'
import { OccupancyChart } from '@/components/Dashboard/OccupancyChart'
import { AIEditsPanel } from '@/components/AI/AIEditsPanel'
import { Calendar, DollarSign, TrendingUp, Users, Clock, CheckSquare } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { t, formatCurrency } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import type { AIEdit, Booking, CleaningTask } from '@/lib/supabase'

export default function DashboardPage() {
  const { language } = useLanguage()
  const [data, setData] = useState({
    aiEdits: [] as AIEdit[],
    upcomingBookings: [] as Booking[],
    pendingTasks: [] as CleaningTask[],
    kpis: {
      totalRevenue: 12500,
      occupancyRate: 88,
      averageDailyRate: 185,
      totalBookings: 24
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const [aiEditsResponse, bookingsResponse, tasksResponse] = await Promise.all([
        supabase
          .from('ai_edits')
          .select('*, property:properties(*)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('bookings')
          .select('*, property:properties(*)')
          .gte('check_in_date', new Date().toISOString())
          .order('check_in_date')
          .limit(5),
        
        supabase
          .from('cleaning_tasks')
          .select('*, property:properties(*), cleaner:cleaners(*)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      setData(prev => ({
        ...prev,
        aiEdits: aiEditsResponse.data || [],
        upcomingBookings: bookingsResponse.data || [],
        pendingTasks: tasksResponse.data || []
      }))
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleApproveAIEdit(id: string) {
    try {
      const { error } = await supabase
        .from('ai_edits')
        .update({ status: 'approved', applied_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      // Refresh data
      loadDashboardData()
    } catch (error) {
      console.error('Error approving AI edit:', error)
    }
  }

  async function handleRejectAIEdit(id: string) {
    try {
      const { error } = await supabase
        .from('ai_edits')
        .update({ status: 'rejected' })
        .eq('id', id)

      if (error) throw error
      
      // Refresh data
      loadDashboardData()
    } catch (error) {
      console.error('Error rejecting AI edit:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {t('dashboard', language)}
        </h1>
        <p className="text-muted-foreground mt-2">
          {language === 'ar' 
            ? 'مرحباً بك في لوحة تحكم أزها بوست' 
            : 'Welcome to your AzhaBoost dashboard'
          }
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={t('totalRevenue', language)}
          value={formatCurrency(data.kpis.totalRevenue, language)}
          change={{ value: 12, type: 'increase', period: 'last month' }}
          icon={DollarSign}
        />
        <KPICard
          title={t('occupancyRate', language)}
          value={`${data.kpis.occupancyRate}%`}
          change={{ value: 5, type: 'increase', period: 'last month' }}
          icon={TrendingUp}
        />
        <KPICard
          title={t('averageDailyRate', language)}
          value={formatCurrency(data.kpis.averageDailyRate, language)}
          change={{ value: 8, type: 'increase', period: 'last month' }}
          icon={Calendar}
        />
        <KPICard
          title={t('totalBookings', language)}
          value={data.kpis.totalBookings}
          change={{ value: 15, type: 'increase', period: 'last month' }}
          icon={Users}
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OccupancyChart />
        
        {/* Upcoming Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('upcomingCheckIns', language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {language === 'ar' ? 'لا توجد حجوزات قادمة' : 'No upcoming check-ins'}
              </p>
            ) : (
              <div className="space-y-3">
                {data.upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{booking.guest_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.check_in_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {booking.property?.name_en}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Edits and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIEditsPanel
          aiEdits={data.aiEdits}
          onApprove={handleApproveAIEdit}
          onReject={handleRejectAIEdit}
        />

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              {t('pendingTasks', language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.pendingTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {language === 'ar' ? 'لا توجد مهام معلقة' : 'No pending tasks'}
              </p>
            ) : (
              <div className="space-y-3">
                {data.pendingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">
                        {language === 'ar' ? task.title_ar : task.title_en}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {task.property?.name_en}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {t(task.priority as keyof typeof import('@/lib/i18n').translations, language)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}