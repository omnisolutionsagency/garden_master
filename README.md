# 🌱 Garden Manager

A smart garden management app that tracks your herbs and vegetables, monitors weather conditions, and uses Claude AI to recommend precise watering and fertilizing schedules.

## Stack

- **Frontend**: React Native (Expo) with Expo Router
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: Anthropic Claude API for plant care analysis
- **Weather**: OpenWeatherMap API
- **Hosting**: GitHub

## Features

- **Plant Inventory**: Add herbs, vegetables, and custom plants with growth profiles
- **Smart Watering**: AI-calculated watering amounts based on plant type, soil, weather, and season
- **Fertilizer Recommendations**: Claude-powered analysis of nutrient needs and schedules
- **Weather Integration**: Automatic rainfall tracking, temperature monitoring, frost alerts
- **Watering Log**: Track actual vs. recommended watering to improve accuracy over time
- **Push Notifications**: Reminders for watering, fertilizing, and harvest windows

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase account (free tier works)
- Anthropic API key
- OpenWeatherMap API key (free tier)

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/garden-manager.git
cd garden-manager
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_OPENWEATHERMAP_API_KEY=your-owm-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### 3. Supabase Setup

1. Create a new Supabase project
2. Run the migration in `supabase/migrations/001_initial_schema.sql` via the SQL editor
3. Enable Row Level Security policies (included in migration)
4. Deploy edge functions:

```bash
supabase functions deploy analyze-garden
```

### 4. Run

```bash
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `i`/`a` for simulators.

## Architecture

```
src/
├── screens/          # App screens (Home, Plants, PlantDetail, Schedule, Settings)
├── components/       # Reusable UI components
├── services/         # API clients (Supabase, Weather, Claude)
├── hooks/            # Custom React hooks
├── utils/            # Helper functions
├── constants/        # Plant data, theme, config
├── types/            # TypeScript type definitions
└── navigation/       # Expo Router layout
supabase/
├── migrations/       # Database schema
└── functions/        # Edge functions (Claude API proxy)
```

## Claude AI Integration

The app proxies Claude API calls through a Supabase Edge Function to keep your API key secure. The AI analyzes:

- Plant species + growth stage
- Current soil moisture estimates
- 7-day weather forecast (temp, humidity, rainfall)
- Watering/fertilizing history
- Regional growing zone data

And returns specific recommendations:
- Gallons/liters of water per plant
- Fertilizer type, amount, and frequency
- Alerts (frost warning, heat stress, overwatering risk)
