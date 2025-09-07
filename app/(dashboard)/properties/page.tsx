'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Building, MapPin, TrendingUp, Settings } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@/lib/i18n'

// Mock properties data
const mockProperties = [
  {
    id: '1',
    name_en: 'Luxury Azha Villa Premium',
    name_ar: 'فيلا أزها الفاخرة المميزة',
    address: 'North Coast, Egypt',
    current_rank: 8,
    target_rank: 3,
    occupancy_rate: 92,
    monthly_revenue: 15200
  },
  {
    id: '2',
    name_en: 'Modern Azha Beachfront Suite',
    name_ar: 'جناح أزها الحديث على البحر',
    address: 'Azha Ain Sokhna, Egypt',
    current_rank: 12,
    target_rank: 5,
    occupancy_rate: 85,
    monthly_revenue: 9800
  },
  {
    id: '3',
    name_en: 'Family-Friendly Azha Resort Villa',
    name_ar: 'فيلا منتجع أزها للعائلات',
    address: 'Azha North Coast, Egypt',
    current_rank: 15,
    target_rank: 8,
    occupancy_rate: 78,
    monthly_revenue: 7500
  }
]

export default function PropertiesPage() {
  const { language } = useLanguage()
  const [properties] = useState(mockProperties)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('properties', language)}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === 'ar' 
              ? 'إدارة وتحسين عقاراتك في أزها'
              : 'Manage and optimize your Azha properties'
            }
          </p>
        </div>
        
        <Button className="bg-[#005F73] hover:bg-[#005F73]/90">
          <Plus className="h-4 w-4 mr-2" />
          {t('addProperty', language)}
        </Button>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card key={property.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-[#005F73]" />
                  <CardTitle className="text-lg">
                    {language === 'ar' ? property.name_ar : property.name_en}
                  </CardTitle>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{property.address}</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Ranking */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'الترتيب الحالي' : 'Current Rank'}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={property.current_rank <= property.target_rank ? 'default' : 'secondary'}>
                    #{property.current_rank}
                  </Badge>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'هدف' : 'Target'}: #{property.target_rank}
                  </span>
                </div>
              </div>

              {/* Occupancy Rate */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{language === 'ar' ? 'معدل الإشغال' : 'Occupancy Rate'}</span>
                  <span className="font-medium">{property.occupancy_rate}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-[#94D2BD] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${property.occupancy_rate}%` }}
                  />
                </div>
              </div>

              {/* Monthly Revenue */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'الإيرادات الشهرية' : 'Monthly Revenue'}
                </span>
                <span className="font-bold text-[#005F73]">
                  ${property.monthly_revenue.toLocaleString()}
                </span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" size="sm">
                  {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                </Button>
                <Button variant="outline" size="sm" className="text-[#005F73] border-[#005F73]">
                  {language === 'ar' ? 'تحسين الذكاء الاصطناعي' : 'AI Optimize'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'نظرة عامة على الأداء' : 'Performance Overview'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#005F73]">
                {properties.length}
              </div>
              <div className="text-sm text-muted-foreground">
                {language === 'ar' ? 'إجمالي العقارات' : 'Total Properties'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#94D2BD]">
                {Math.round(properties.reduce((sum, p) => sum + p.occupancy_rate, 0) / properties.length)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {language === 'ar' ? 'متوسط الإشغال' : 'Avg Occupancy'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#005F73]">
                ${properties.reduce((sum, p) => sum + p.monthly_revenue, 0).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                {language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#94D2BD]">
                {Math.round(properties.reduce((sum, p) => sum + p.current_rank, 0) / properties.length)}
              </div>
              <div className="text-sm text-muted-foreground">
                {language === 'ar' ? 'متوسط الترتيب' : 'Avg Rank'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}