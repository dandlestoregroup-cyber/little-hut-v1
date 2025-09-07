# AzhaBoost - Intelligent Property Management System

A comprehensive bilingual (Arabic/English) property management system built with Next.js 14, designed specifically for Azha properties. Features AI-powered optimization, smart lock integration, automated cleaning management, and seamless guest experiences.

## 🚀 Features

### 🏠 **Owner Dashboard**
- Real-time KPIs: occupancy rates, ADR, city rankings
- Calendar synchronization (refreshes every 30 minutes)
- AI-powered listing optimization with one-click approval
- Automated Airbnb listing updates via Hospitable API

### 👥 **Guest Portal**
- 3-step check-in flow: booking lookup → contract signing → PIN generation
- Stripe integration for security deposits and add-on services
- Dynamic smart lock PIN with auto-expiration (2 hours after checkout)
- Multilingual support (Arabic/English) with RTL layout

### 🧹 **Cleaner Management Bot**
- Automated task creation triggered by checkout detection
- Notion task management integration
- Telegram bot notifications to cleaning staff
- Photo checklist requirements for task completion

### 🤖 **AI-Powered Ranking Engine**
- Daily cron job at 09:00 UTC for market analysis
- Airbnb ranking scraping and competitor analysis
- Claude AI integration for content optimization
- Automated pricing recommendations from PriceLabs

### 🔒 **Smart Lock Integration**
- Tuya Cloud API integration for PIN management
- Automatic PIN expiration scheduling
- Real-time lock status monitoring

## 🛠 Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **AI**: Anthropic Claude for content optimization
- **Payments**: Stripe for secure transactions
- **Smart Locks**: Tuya Cloud API integration
- **Notifications**: Telegram Bot API
- **Task Management**: Notion API
- **Deployment**: Vercel with Edge Functions

## 📁 Project Structure

```
azhaboost/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Dashboard layout group
│   ├── api/                     # API routes
│   ├── check-in/               # Guest check-in flow
│   └── globals.css
├── components/                  # Reusable components
│   ├── AI/                     # AI-related components
│   ├── CheckIn/               # Check-in flow components
│   ├── Dashboard/             # Dashboard components
│   ├── Layout/                # Layout components
│   └── ui/                    # Shadcn/ui components
├── contexts/                   # React contexts
├── lib/                       # Utility functions
├── supabase/                  # Database migrations
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Vercel account (for deployment)

### 1. Clone and Install
```bash
git clone <repository-url>
cd azhaboost
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
```

Fill in your environment variables:
- Supabase URL and keys
- Stripe API keys
- Anthropic API key
- Third-party service tokens

### 3. Database Setup
1. Click "Connect to Supabase" button in the top right
2. Run the migration from `supabase/migrations/create_schema.sql`
3. The database schema will be automatically created

### 4. Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 5. Production Deployment
```bash
# One-command Vercel deployment
vercel --prod
```

## 📊 Database Schema

### Core Tables
- **`owners`** - Property owner profiles and preferences
- **`properties`** - Property details and configurations  
- **`bookings`** - Guest bookings and check-in status
- **`cleaners`** - Cleaner profiles and contact information
- **`cleaning_tasks`** - Task management and photo requirements
- **`ai_edits`** - AI optimization suggestions and approvals
- **`pricing_data`** - Historical pricing and market analysis
- **`smart_locks`** - Device management and PIN tracking

### Key Features
- Row Level Security (RLS) enabled on all tables
- Automatic timestamp updates with triggers
- Optimized indexes for performance
- Multi-language support with separate fields

## 🔧 API Endpoints

### AI Optimization
- `POST /api/ai/optimize-listing` - Generate AI-powered listing improvements
- Scheduled via Vercel cron job daily at 09:00 UTC

### Smart Lock Management
- `POST /api/smart-lock/generate-pin` - Create dynamic PINs with expiration

### Cleaning Automation
- `POST /api/cleaning/trigger-task` - Auto-create cleaning tasks with notifications

### Calendar Synchronization
- `POST /api/calendar/sync` - Sync iCal bookings every 30 minutes

### Payment Processing  
- `POST /api/stripe/create-payment` - Handle deposits and add-on services

## 🌐 Multilingual Support

### Language Features
- Complete Arabic and English translation
- RTL (Right-to-Left) layout for Arabic content
- Context-aware font selection (Noto Kufi Arabic / Inter)
- Localized date, time, and currency formatting
- Dynamic language switching with persistence

### Typography
- **Arabic**: Noto Kufi Arabic font
- **English**: Inter font
- Optimized for readability and aesthetic appeal

## 🎨 Design System

### Brand Colors
- **Primary**: `#005F73` (Deep Teal)
- **Secondary**: `#94D2BD` (Mint Green)
- Professional, trustworthy color palette

### UI Components
- shadcn/ui component library
- Dark mode support with theme toggle
- Responsive design for all devices
- Consistent spacing with 8px grid system

## 🔐 Security

### Authentication & Authorization
- Supabase Auth with email/password
- Row Level Security (RLS) policies
- Service role access for system operations
- Secure API key management

### Data Protection
- Encrypted sensitive data storage
- Secure payment processing via Stripe
- HTTPS enforcement in production
- Regular security audits and updates

## 📱 Mobile Experience

### Responsive Design
- Mobile-first approach
- Touch-optimized interfaces
- Progressive Web App capabilities
- Offline functionality for critical features

### Guest Check-in
- Mobile-optimized 3-step flow
- QR code scanning for booking lookup
- Digital contract signing
- One-tap payment processing

## 🚀 Deployment

### Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

### Environment Variables
Set all required environment variables in Vercel dashboard:
- Database credentials
- API keys for third-party services
- Production URLs and secrets

### Cron Jobs
Automatic scheduling for:
- AI optimization (daily at 09:00 UTC)
- Calendar sync (every 30 minutes)
- System health checks

## 📈 Monitoring & Analytics

### Performance Tracking
- Real-time occupancy rates
- Revenue analytics and trends
- Guest satisfaction metrics
- Property ranking improvements

### System Monitoring
- API response times
- Error tracking and alerts
- Database performance metrics
- Third-party service uptime

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- TypeScript strict mode
- ESLint + Prettier formatting
- Comprehensive JSDoc comments
- Unit tests for critical functions

## 📞 Support

### Documentation
- In-app help tooltips
- API documentation
- Video tutorials
- Best practices guide

### Technical Support
- GitHub Issues for bug reports
- Community Discord server
- Professional support packages available

---

## 🎯 Next Steps

1. **Connect to Supabase** - Click the button in the top right
2. **Configure APIs** - Add your third-party service keys
3. **Customize Branding** - Update colors, logos, and content
4. **Deploy to Production** - One-click Vercel deployment
5. **Monitor & Optimize** - Track performance and user feedback

**Built with ❤️ for Azha property owners seeking to maximize their rental success through intelligent automation and optimization.**