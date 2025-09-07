'use client'

import { useState } from 'react'
import { CheckInFlow } from '@/components/CheckIn/CheckInFlow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Home } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function CheckInPage() {
  const { language } = useLanguage()
  const [checkInComplete, setCheckInComplete] = useState(false)

  if (checkInComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'ar' ? 'مرحباً بكم!' : 'Welcome!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'تم تسجيل وصولكم بنجاح. نتمنى لكم إقامة سعيدة!'
                : 'Your check-in is complete. Enjoy your stay!'
              }
            </p>
            
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Home className="h-4 w-4" />
                <span className="font-medium">
                  {language === 'ar' ? 'معلومات مهمة' : 'Important Info'}
                </span>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• WiFi: AzhaGuest / Password: welcome123</li>
                <li>• {language === 'ar' ? 'الطوارئ: 911' : 'Emergency: 911'}</li>
                <li>• {language === 'ar' ? 'خدمة العملاء: +1-555-0123' : 'Support: +1-555-0123'}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {language === 'ar' ? 'أهلاً وسهلاً' : 'Welcome to AzhaBoost'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'يرجى إكمال عملية تسجيل الوصول في 3 خطوات بسيطة'
              : 'Please complete your check-in process in 3 simple steps'
            }
          </p>
        </div>

        <CheckInFlow onComplete={() => setCheckInComplete(true)} />
      </div>
    </div>
  )
}