import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // CoinLore API (Free, no rate limit, 14000+ cryptos)
      '/api/coinlore': {
        target: 'https://api.coinlore.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coinlore/, ''),
      },
      // CoinGecko API (backup)
      '/api/coingecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
      },
      // Fear & Greed API
      '/api/feargreed': {
        target: 'https://api.alternative.me',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/feargreed/, ''),
      },
      // Financial Modeling Prep API
      '/api/fmp': {
        target: 'https://financialmodelingprep.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fmp/, ''),
      },
      // Gold API
      '/api/gold': {
        target: 'https://www.goldapi.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gold/, ''),
      },
      // ExchangeRate API
      '/api/exchange': {
        target: 'https://v6.exchangerate-api.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/exchange/, ''),
      },
      // Yahoo Finance (via public proxy)
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
      },
      // ForexFactory Calendar (Free, no API key)
      '/api/forexfactory': {
        target: 'https://nfs.faireconomy.media',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/forexfactory/, ''),
      },
      // Frankfurter API (Free forex rates with historical data)
      '/api/frankfurter': {
        target: 'https://api.frankfurter.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/frankfurter/, ''),
      },
      // Finnhub API (Free tier: 60 calls/min, stock news & company data)
      '/api/finnhub': {
        target: 'https://finnhub.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/finnhub/, ''),
      },
    },
  },
})
