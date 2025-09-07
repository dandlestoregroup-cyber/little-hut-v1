import './globals.css'
import type { Metadata } from 'next/metadata'
import { Inter } from 'next/font/google'
import { notoKufiArabic } from '@/components/ui/arabic-fonts'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'AzhaBoost - Intelligent Property Management System',
  description: 'Advanced bilingual property management system for Azha properties with AI optimization, smart locks, and automated operations.',
  keywords: 'property management, Azha, vacation rental, smart locks, AI optimization, bilingual',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        inter.variable,
        notoKufiArabic.variable,
        'font-sans antialiased'
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <div className="min-h-screen bg-background">
              {children}
            </div>
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}