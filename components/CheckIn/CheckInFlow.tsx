'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Key, CreditCard, FileText, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

interface CheckInFlowProps {
  onComplete: () => void
}

export function CheckInFlow({ onComplete }: CheckInFlowProps) {
  const { language, isRTL } = useLanguage()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    bookingReference: '',
    guestName: '',
    guestEmail: '',
    contractSigned: false,
    depositPaid: false,
    smartLockPin: ''
  })

  const steps = [
    {
      id: 1,
      title: language === 'ar' ? 'البحث عن الحجز' : 'Booking Lookup',
      icon: FileText
    },
    {
      id: 2,
      title: language === 'ar' ? 'توقيع العقد' : 'Contract Signing',
      icon: FileText
    },
    {
      id: 3,
      title: language === 'ar' ? 'رقم القفل والدفع' : 'PIN & Payment',
      icon: Key
    }
  ]

  const handleNextStep = async () => {
    setLoading(true)
    
    // Simulate API calls
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (step === 3) {
      // Generate smart lock PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString()
      setFormData(prev => ({ ...prev, smartLockPin: pin }))
      onComplete()
    } else {
      setStep(prev => prev + 1)
    }
    
    setLoading(false)
  }

  const progress = (step / 3) * 100

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {language === 'ar' ? 'تسجيل الوصول' : 'Check-in Process'}
          </CardTitle>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className={cn(
              "flex justify-between text-sm text-muted-foreground",
              isRTL && "flex-row-reverse"
            )}>
              {steps.map(({ id, title }) => (
                <span key={id} className={cn(
                  "flex items-center gap-1",
                  step >= id && "text-primary font-medium"
                )}>
                  {step > id ? <CheckCircle className="h-4 w-4" /> : id}
                  <span className="hidden sm:inline">{title}</span>
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(steps[step - 1].icon, { className: "h-5 w-5" })}
            {steps[step - 1].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Booking Lookup */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="booking-ref">
                  {language === 'ar' ? 'رقم الحجز' : 'Booking Reference'}
                </Label>
                <Input
                  id="booking-ref"
                  placeholder={language === 'ar' ? 'أدخل رقم الحجز' : 'Enter booking reference'}
                  value={formData.bookingReference}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    bookingReference: e.target.value 
                  }))}
                />
              </div>
              
              {formData.bookingReference && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">
                    {language === 'ar' ? 'تفاصيل الحجز' : 'Booking Details'}
                  </h4>
                  <p><strong>{language === 'ar' ? 'اسم النزيل' : 'Guest'}:</strong> John Smith</p>
                  <p><strong>{language === 'ar' ? 'العقار' : 'Property'}:</strong> Azha Villa Premium</p>
                  <p><strong>{language === 'ar' ? 'التواريخ' : 'Dates'}:</strong> Jan 15-20, 2024</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Contract Signing */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-3">
                  {language === 'ar' ? 'عقد الإقامة' : 'Rental Agreement'}
                </h4>
                <div className="text-sm text-muted-foreground space-y-2 max-h-40 overflow-y-auto">
                  <p>This agreement outlines the terms and conditions...</p>
                  <p>1. Check-in time is 3:00 PM, check-out is 11:00 AM</p>
                  <p>2. No smoking or pets allowed on the premises</p>
                  <p>3. Maximum occupancy is 6 guests</p>
                  <p>4. Quiet hours are from 10:00 PM to 8:00 AM</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="contract-agree"
                  checked={formData.contractSigned}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contractSigned: e.target.checked 
                  }))}
                />
                <Label htmlFor="contract-agree" className="text-sm">
                  {language === 'ar' 
                    ? 'أوافق على شروط وأحكام العقد' 
                    : 'I agree to the terms and conditions'
                  }
                </Label>
              </div>
            </div>
          )}

          {/* Step 3: PIN & Payment */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Security Deposit */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-3">
                  {language === 'ar' ? 'الضمان المالي' : 'Security Deposit'}
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {language === 'ar' 
                    ? 'مطلوب دفع ضمان مالي قدره $200 والذي سيتم استرداده بعد المغادرة'
                    : 'A $200 security deposit is required and will be refunded after checkout'
                  }
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setFormData(prev => ({ ...prev, depositPaid: true }))}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'دفع الضمان ($200)' : 'Pay Deposit ($200)'}
                </Button>
              </div>

              <Separator />

              {/* Add-on Services */}
              <div>
                <h4 className="font-medium mb-3">
                  {language === 'ar' ? 'خدمات إضافية' : 'Add-on Services'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card className="p-3">
                    <h5 className="font-medium">{language === 'ar' ? 'خدمة النظافة الإضافية' : 'Extra Cleaning'}</h5>
                    <p className="text-sm text-muted-foreground">$50</p>
                  </Card>
                  <Card className="p-3">
                    <h5 className="font-medium">{language === 'ar' ? 'إفطار صباحي' : 'Breakfast Service'}</h5>
                    <p className="text-sm text-muted-foreground">$25/day</p>
                  </Card>
                </div>
              </div>

              {/* Smart Lock PIN */}
              {formData.depositPaid && (
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">
                      {language === 'ar' ? 'رقم القفل الذكي' : 'Smart Lock PIN'}
                    </h4>
                  </div>
                  <div className="text-2xl font-mono font-bold text-primary mb-2">
                    {formData.smartLockPin || '******'}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'ينتهي صالح الرقم بعد ساعتين من انتهاء الإقامة'
                      : 'PIN expires 2 hours after checkout'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className={cn(
            "flex gap-3 pt-4",
            isRTL && "flex-row-reverse"
          )}>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(prev => prev - 1)}
                disabled={loading}
              >
                {language === 'ar' ? 'السابق' : 'Previous'}
              </Button>
            )}
            
            <Button
              className="flex-1"
              onClick={handleNextStep}
              disabled={loading || (step === 2 && !formData.contractSigned)}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {step === 3 
                ? (language === 'ar' ? 'إكمال تسجيل الوصول' : 'Complete Check-in')
                : (language === 'ar' ? 'التالي' : 'Next')
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}