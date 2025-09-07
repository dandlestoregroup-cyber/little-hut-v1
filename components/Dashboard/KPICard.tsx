'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

export function KPICard({ title, value, change, icon: Icon, className }: KPICardProps) {
  const { language, isRTL } = useLanguage()

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={cn(
            "text-xs flex items-center gap-1",
            isRTL && "flex-row-reverse",
            change.type === 'increase' ? "text-green-600" : "text-red-600"
          )}>
            <span className={cn(
              "inline-flex items-center",
              change.type === 'increase' ? "text-green-600" : "text-red-600"
            )}>
              {change.type === 'increase' ? '↗' : '↘'} {Math.abs(change.value)}%
            </span>
            <span className="text-muted-foreground">
              {language === 'ar' ? `من ${change.period}` : `from ${change.period}`}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}