'use client'

import { Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

export function Header() {
  const { language, isRTL } = useLanguage()

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className={cn(
            "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
            isRTL ? "right-3" : "left-3"
          )} />
          <Input
            placeholder={language === 'ar' ? 'البحث...' : 'Search...'}
            className={cn(
              "w-full",
              isRTL ? "pr-10" : "pl-10"
            )}
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="sm">
          <Bell className="h-4 w-4" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {language === 'ar' ? 'حسابي' : 'My Account'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              {language === 'ar' ? 'الملف الشخصي' : 'Profile'}
            </DropdownMenuItem>
            <DropdownMenuItem>
              {language === 'ar' ? 'الإعدادات' : 'Settings'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              {language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}