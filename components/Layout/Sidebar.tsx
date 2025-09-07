'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Building, 
  Calendar, 
  Users, 
  CheckSquare, 
  BarChart3, 
  Settings,
  Bot,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageToggle } from '@/components/LanguageToggle'

const navigation = [
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'properties', href: '/properties', icon: Building },
  { name: 'bookings', href: '/bookings', icon: Calendar },
  { name: 'cleaners', href: '/cleaners', icon: Users },
  { name: 'tasks', href: '/tasks', icon: CheckSquare },
  { name: 'analytics', href: '/analytics', icon: BarChart3 },
  { name: 'settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { language, isRTL } = useLanguage()

  return (
    <div className={cn(
      "flex h-screen w-64 flex-col bg-card border-r",
      isRTL && "border-l border-r-0"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Home className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold text-primary">AzhaBoost</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isRTL && "flex-row-reverse",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.name as keyof typeof import('@/lib/i18n').translations, language)}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t space-y-2">
        <div className="flex gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        
        {/* AI Bot Status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="h-3 w-3 text-green-500" />
          <span>{language === 'ar' ? 'الذكاء الاصطناعي نشط' : 'AI Active'}</span>
        </div>
      </div>
    </div>
  )
}