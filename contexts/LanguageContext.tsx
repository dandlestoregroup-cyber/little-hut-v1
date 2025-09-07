'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Language } from '@/lib/i18n'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    // Load language preference from localStorage
    const savedLanguage = localStorage.getItem('azhaboost-language') as Language
    if (savedLanguage && ['en', 'ar'].includes(savedLanguage)) {
      setLanguage(savedLanguage)
    }
  }, [])

  useEffect(() => {
    // Save language preference and update document direction
    localStorage.setItem('azhaboost-language', language)
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  const isRTL = language === 'ar'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}