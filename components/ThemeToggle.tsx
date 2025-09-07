'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/contexts/LanguageContext'

export function ThemeToggle() {
  const { setTheme } = useTheme()
  const { language } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          {language === 'ar' ? 'فاتح' : 'Light'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          {language === 'ar' ? 'داكن' : 'Dark'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          {language === 'ar' ? 'النظام' : 'System'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}