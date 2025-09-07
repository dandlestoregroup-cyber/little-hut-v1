export type Language = 'en' | 'ar'

export interface Translation {
  en: string
  ar: string
}

export const translations = {
  // Navigation
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم' },
  properties: { en: 'Properties', ar: 'العقارات' },
  bookings: { en: 'Bookings', ar: 'الحجوزات' },
  cleaners: { en: 'Cleaners', ar: 'عمال النظافة' },
  tasks: { en: 'Tasks', ar: 'المهام' },
  analytics: { en: 'Analytics', ar: 'التحليلات' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
  
  // Dashboard
  totalRevenue: { en: 'Total Revenue', ar: 'إجمالي الإيرادات' },
  occupancyRate: { en: 'Occupancy Rate', ar: 'معدل الإشغال' },
  averageDailyRate: { en: 'Average Daily Rate', ar: 'متوسط السعر اليومي' },
  totalBookings: { en: 'Total Bookings', ar: 'إجمالي الحجوزات' },
  upcomingCheckIns: { en: 'Upcoming Check-ins', ar: 'الوصول القادم' },
  pendingTasks: { en: 'Pending Tasks', ar: 'المهام المعلقة' },
  aiOptimizations: { en: 'AI Optimizations', ar: 'تحسينات الذكاء الاصطناعي' },
  
  // Property Management
  addProperty: { en: 'Add Property', ar: 'إضافة عقار' },
  propertyName: { en: 'Property Name', ar: 'اسم العقار' },
  address: { en: 'Address', ar: 'العنوان' },
  city: { en: 'City', ar: 'المدينة' },
  currentRank: { en: 'Current Rank', ar: 'الترتيب الحالي' },
  targetRank: { en: 'Target Rank', ar: 'الترتيب المستهدف' },
  
  // Booking Management
  guestName: { en: 'Guest Name', ar: 'اسم النزيل' },
  checkIn: { en: 'Check-in', ar: 'تسجيل الوصول' },
  checkOut: { en: 'Check-out', ar: 'تسجيل المغادرة' },
  bookingReference: { en: 'Booking Reference', ar: 'مرجع الحجز' },
  smartLockPin: { en: 'Smart Lock PIN', ar: 'رقم القفل الذكي' },
  
  // Cleaner Management
  cleanerName: { en: 'Cleaner Name', ar: 'اسم عامل النظافة' },
  phone: { en: 'Phone', ar: 'الهاتف' },
  hourlyRate: { en: 'Hourly Rate', ar: 'الأجر بالساعة' },
  
  // Task Management
  taskTitle: { en: 'Task Title', ar: 'عنوان المهمة' },
  description: { en: 'Description', ar: 'الوصف' },
  priority: { en: 'Priority', ar: 'الأولوية' },
  status: { en: 'Status', ar: 'الحالة' },
  assignedTo: { en: 'Assigned To', ar: 'مُكلف إلى' },
  
  // AI Edits
  aiSuggestions: { en: 'AI Suggestions', ar: 'اقتراحات الذكاء الاصطناعي' },
  optimizedTitle: { en: 'Optimized Title', ar: 'العنوان المحسن' },
  suggestedPrice: { en: 'Suggested Price', ar: 'السعر المقترح' },
  approve: { en: 'Approve', ar: 'موافق' },
  reject: { en: 'Reject', ar: 'رفض' },
  
  // Common
  save: { en: 'Save', ar: 'حفظ' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  delete: { en: 'Delete', ar: 'حذف' },
  edit: { en: 'Edit', ar: 'تعديل' },
  view: { en: 'View', ar: 'عرض' },
  loading: { en: 'Loading...', ar: 'جاري التحميل...' },
  error: { en: 'Error', ar: 'خطأ' },
  success: { en: 'Success', ar: 'نجح' },
  
  // Status
  pending: { en: 'Pending', ar: 'معلق' },
  approved: { en: 'Approved', ar: 'موافق عليه' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  inProgress: { en: 'In Progress', ar: 'قيد التنفيذ' },
  
  // Priority levels
  low: { en: 'Low', ar: 'منخفض' },
  medium: { en: 'Medium', ar: 'متوسط' },
  high: { en: 'High', ar: 'عالي' },
  urgent: { en: 'Urgent', ar: 'عاجل' },
} as const

export function t(key: keyof typeof translations, language: Language = 'en'): string {
  return translations[key]?.[language] || key
}

export function getLocalizedValue<T extends Record<string, any>>(
  obj: T,
  field: string,
  language: Language = 'en'
): string {
  const localizedField = `${field}_${language}`
  return obj[localizedField] || obj[field] || ''
}

export function formatCurrency(amount: number, language: Language = 'en'): string {
  const formatter = new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  
  return formatter.format(amount)
}

export function formatDate(date: string | Date, language: Language = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const formatter = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  
  return formatter.format(dateObj)
}

export function formatTime(date: string | Date, language: Language = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const formatter = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  
  return formatter.format(dateObj)
}