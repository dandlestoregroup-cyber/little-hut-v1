'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLanguage } from '@/contexts/LanguageContext'

const mockData = [
  { date: '2024-01-01', occupancy: 85 },
  { date: '2024-01-02', occupancy: 90 },
  { date: '2024-01-03', occupancy: 78 },
  { date: '2024-01-04', occupancy: 95 },
  { date: '2024-01-05', occupancy: 88 },
  { date: '2024-01-06', occupancy: 92 },
  { date: '2024-01-07', occupancy: 87 },
]

export function OccupancyChart() {
  const { language } = useLanguage()

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>
          {language === 'ar' ? 'معدل الإشغال - 7 أيام' : 'Occupancy Rate - 7 Days'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value) => [`${value}%`, language === 'ar' ? 'معدل الإشغال' : 'Occupancy']}
              />
              <Area 
                type="monotone" 
                dataKey="occupancy" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}