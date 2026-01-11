# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FINTERM - A financial terminal dashboard for tracking global markets. Built with React + Vite + TypeScript + Tailwind CSS.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Architecture

### Tech Stack
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (terminal dark theme)
- **State Management:** Zustand (planned)
- **Local Database:** IndexedDB with Dexie.js (planned)
- **Charts:** TradingView Widgets (embedded)
- **HTTP Client:** Axios

### Project Structure
```
src/
├── components/
│   ├── layout/          # Header, Dashboard layout
│   ├── widgets/         # Market data widgets (8 total)
│   └── ui/              # Reusable UI components (Card, etc.)
├── services/
│   └── api/             # API service files (FMP, CoinGecko, etc.)
├── store/               # Zustand store
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

### Widget Components
1. **SectorHeatmap** - US sector performance grid
2. **SP500TopMovers** - Daily/Weekly/Monthly top performers
3. **PreciousMetals** - Gold, Silver, Platinum, Palladium
4. **CryptoTracker** - Customizable crypto list
5. **FearGreedIndex** - Market sentiment gauge
6. **VixIndex** - Volatility indicator
7. **CurrencyRates** - Forex pairs (USD/TRY, EUR/USD, etc.)
8. **BISTOverview** - Turkish stock market

### API Integrations (Planned)
- Financial Modeling Prep (US stocks, sectors)
- CoinGecko (cryptocurrency)
- Gold-API (precious metals)
- Yahoo Finance (VIX, BIST, currencies)
- Alternative.me (Fear & Greed)

## Development Rules

- **All frontend changes must use the `/frontend-design` skill.** This ensures high design quality and production-grade interfaces.

## Environment Variables

Create a `.env` file with:
```env
VITE_FMP_API_KEY=your_key_here
VITE_GOLD_API_KEY=your_key_here
```

## Design System

### Colors (Tailwind)
- `terminal-bg`: #0a0a0f (main background)
- `terminal-card`: #12131a (card background)
- `neon-green`: #00ff88 (positive values)
- `neon-red`: #ff3366 (negative values)
- `neon-amber`: #ffb000 (neutral/warning)
- `neon-cyan`: #00d4ff (accents)

### Typography
- Display: Share Tech Mono
- Mono: JetBrains Mono
