'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Brain, Check, X, TrendingUp } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { t, getLocalizedValue, formatCurrency } from '@/lib/i18n'
import type { AIEdit } from '@/lib/supabase'

interface AIEditsPanelProps {
  aiEdits: AIEdit[]
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
}

export function AIEditsPanel({ aiEdits, onApprove, onReject }: AIEditsPanelProps) {
  const { language, isRTL } = useLanguage()
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setLoading(id)
    try {
      if (action === 'approve') {
        await onApprove(id)
      } else {
        await onReject(id)
      }
    } finally {
      setLoading(null)
    }
  }

  const pendingEdits = aiEdits.filter(edit => edit.status === 'pending')

  if (pendingEdits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {t('aiOptimizations', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' 
              ? 'لا توجد تحسينات معلقة من الذكاء الاصطناعي'
              : 'No pending AI optimizations'
            }
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          {t('aiOptimizations', language)}
          <Badge variant="secondary">{pendingEdits.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingEdits.map((edit) => (
          <div key={edit.id} className="border rounded-lg p-4 space-y-3">
            {/* Property Info */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                {getLocalizedValue(edit.property || {}, 'name', language)}
              </h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>
                  #{edit.current_rank} → #{edit.target_rank}
                </span>
              </div>
            </div>

            {/* Optimized Title */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {t('optimizedTitle', language)}
              </p>
              <p className="text-sm">
                {getLocalizedValue(edit, 'title', language)}
              </p>
            </div>

            {/* Bullet Points */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {language === 'ar' ? 'النقاط الرئيسية' : 'Key Points'}
              </p>
              <ul className={`text-sm space-y-1 ${isRTL ? 'pr-4' : 'pl-4'}`}>
                {(language === 'ar' ? edit.bullets_ar : edit.bullets_en)
                  .slice(0, 3)
                  .map((bullet, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
              </ul>
            </div>

            <Separator />

            {/* Price and Confidence */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t('suggestedPrice', language)}: {formatCurrency(edit.suggested_price, language)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'مستوى الثقة' : 'Confidence'}: {Math.round(edit.ai_confidence_score * 100)}%
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(edit.id, 'reject')}
                  disabled={loading === edit.id}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('reject', language)}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAction(edit.id, 'approve')}
                  disabled={loading === edit.id}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {t('approve', language)}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}