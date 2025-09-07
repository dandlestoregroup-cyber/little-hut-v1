'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building, 
  Brain, 
  Smartphone, 
  Users, 
  TrendingUp, 
  Clock,
  Shield,
  Globe,
  ChevronRight,
  Star,
  Zap
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'

const features = [
  {
    icon: Brain,
    titleEn: 'AI-Powered Optimization',
    titleAr: 'تحسين بالذكاء الاصطناعي',
    descEn: 'Automated listing optimization and pricing recommendations using Claude AI',
    descAr: 'تحسين تلقائي للإعلانات وتوصيات الأسعار باستخدام ذكاء Claude الاصطناعي'
  },
  {
    icon: Smartphone,
    titleEn: 'Smart Lock Integration',
    titleAr: 'تكامل الأقفال الذكية',
    descEn: 'Dynamic PIN generation with automatic expiration via Tuya Cloud API',
    descAr: 'إنشاء رقم سري ديناميكي مع انتهاء صالحية تلقائي عبر Tuya Cloud API'
  },
  {
    icon: Users,
    titleEn: 'Guest Portal',
    titleAr: 'بوابة النزلاء',
    descEn: '3-step check-in flow with contract signing and payment processing',
    descAr: 'عملية تسجيل وصول من 3 خطوات مع توقيع العقد ومعالجة الدفع'
  },
  {
    icon: Clock,
    titleEn: 'Automated Cleaning',
    titleAr: 'تنظيف آلي',
    descEn: 'Smart cleaning task creation with Telegram notifications and Notion integration',
    descAr: 'إنشاء مهام تنظيف ذكية مع إشعارات تليجرام وتكامل Notion'
  }
]

const stats = [
  { value: '50+', labelEn: 'Properties Managed', labelAr: 'عقار مُدار' },
  { value: '98%', labelEn: 'Guest Satisfaction', labelAr: 'رضا النزلاء' },
  { value: '35%', labelEn: 'Revenue Increase', labelAr: 'زيادة الإيرادات' },
  { value: '24/7', labelEn: 'AI Monitoring', labelAr: 'مراقبة الذكاء الاصطناعي' }
]

export default function HomePage() {
  const { language } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#005F73]">
                <Building className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-[#005F73]">AzhaBoost</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <ThemeToggle />
              <Link href="/dashboard">
                <Button>
                  {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-[#005F73] border-[#005F73]/20">
            <Zap className="h-3 w-3 mr-1" />
            {language === 'ar' ? 'مدعوم بالذكاء الاصطناعي' : 'AI-Powered Platform'}
          </Badge>
          
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-[#005F73] to-[#94D2BD] bg-clip-text text-transparent">
            {language === 'ar' 
              ? 'نظام إدارة العقارات الذكي'
              : 'Intelligent Property Management'
            }
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            {language === 'ar'
              ? 'منصة شاملة ثنائية اللغة لإدارة العقارات في أزها مع تحسين الذكاء الاصطناعي والأقفال الذكية والعمليات المؤتمتة'
              : 'Comprehensive bilingual platform for managing Azha properties with AI optimization, smart locks, and automated operations'
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-[#005F73] hover:bg-[#005F73]/90 text-white">
                {language === 'ar' ? 'ابدأ الآن' : 'Get Started'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/check-in">
              <Button size="lg" variant="outline" className="border-[#005F73] text-[#005F73]">
                {language === 'ar' ? 'تسجيل الوصول' : 'Guest Check-in'}
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {stats.map((stat, index) => (
              <Card key={index} className="border-[#005F73]/10">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-[#005F73] mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? stat.labelAr : stat.labelEn}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-[#005F73]">
              {language === 'ar' ? 'المميزات الرئيسية' : 'Key Features'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {language === 'ar'
                ? 'منصة متكاملة مصممة خصيصاً لإدارة عقارات أزها بكفاءة وذكاء'
                : 'Comprehensive platform designed specifically for efficient and intelligent Azha property management'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-[#005F73]/10 hover:border-[#005F73]/30 transition-colors group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#94D2BD]/20 flex items-center justify-center group-hover:bg-[#94D2BD]/30 transition-colors">
                      <feature.icon className="h-5 w-5 text-[#005F73]" />
                    </div>
                    <CardTitle className="text-[#005F73]">
                      {language === 'ar' ? feature.titleAr : feature.titleEn}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    {language === 'ar' ? feature.descAr : feature.descEn}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="border-[#005F73]/20 bg-gradient-to-r from-[#005F73]/5 to-[#94D2BD]/5">
            <CardContent className="p-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Star className="h-5 w-5 text-[#005F73]" />
                <Badge variant="secondary" className="text-[#005F73]">
                  {language === 'ar' ? 'جاهز للإنتاج' : 'Production Ready'}
                </Badge>
                <Star className="h-5 w-5 text-[#005F73]" />
              </div>
              
              <h2 className="text-3xl font-bold mb-4 text-[#005F73]">
                {language === 'ar' 
                  ? 'ابدأ رحلتك مع أزها بوست اليوم'
                  : 'Start Your AzhaBoost Journey Today'
                }
              </h2>
              
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                {language === 'ar'
                  ? 'انضم إلى مئات مالكي العقارات الذين يستخدمون أزها بوست لتحسين عوائدهم وتبسيط عملياتهم'
                  : 'Join hundreds of property owners who use AzhaBoost to optimize their returns and streamline operations'
                }
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard">
                  <Button size="lg" className="bg-[#005F73] hover:bg-[#005F73]/90 text-white">
                    <Building className="mr-2 h-4 w-4" />
                    {language === 'ar' ? 'ابدأ إدارة عقاراتك' : 'Manage Your Properties'}
                  </Button>
                </Link>
                <Link href="/check-in">
                  <Button size="lg" variant="outline" className="border-[#94D2BD] text-[#005F73]">
                    <Users className="mr-2 h-4 w-4" />
                    {language === 'ar' ? 'بوابة النزلاء' : 'Guest Portal'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#005F73]">
                <Building className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-[#005F73]">AzhaBoost</span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span>{language === 'ar' ? 'متعدد اللغات' : 'Multilingual'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span>{language === 'ar' ? 'آمن ومحمي' : 'Secure & Protected'}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
            © 2024 AzhaBoost. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
          </div>
        </div>
      </footer>
    </div>
  )
}