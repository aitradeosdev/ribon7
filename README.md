# Ribon7 Frontend

Modern React-based trading platform frontend with real-time data visualization and PWA capabilities.

## Features

- **Modern UI**: React 19 with Tailwind CSS and Framer Motion animations
- **Real-time Trading**: Live charts, positions, and account data via WebSockets
- **PWA Support**: Installable as desktop/mobile app with offline capabilities
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Advanced Charts**: Interactive candlestick charts with technical indicators
- **State Management**: Zustand for efficient state management
- **Form Handling**: React Hook Form with Zod validation
- **Error Boundaries**: Comprehensive error handling and recovery

## Tech Stack

- **React 19.2.4** - Modern React with latest features
- **Vite 8.0.1** - Fast build tool and development server
- **Tailwind CSS 3.4.19** - Utility-first CSS framework
- **Zustand 5.0.12** - Lightweight state management
- **TanStack React Query 5.94.5** - Server state management
- **Recharts 3.8.0** - Chart library for trading data
- **Framer Motion 12.38.0** - Animation library
- **React Hook Form 7.72.0** - Form state management
- **Zod 4.3.6** - Schema validation

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend API running (see backend README)

### Installation

1. **Clone and install dependencies**:
```bash
git clone https://github.com/aitradeosdev/ribon7.git
cd ribon7
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env.local
# Edit .env.local with your API endpoints
```

3. **Start development server**:
```bash
npm run dev
```

4. **Open in browser**:
Visit http://localhost:5173

## Environment Variables

Create `.env.local` file:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_BASE_URL=ws://localhost:8000/ws
```

For production:
```env
VITE_API_BASE_URL=https://yourdomain.com/api/v1
VITE_WS_BASE_URL=wss://yourdomain.com/ws
```

## Project Structure

```
src/
├── api/          # API client functions
├── components/   # Reusable React components
│   ├── charts/   # Trading chart components
│   ├── forms/    # Form components
│   ├── layout/   # Layout components
│   └── ui/       # Base UI components
├── hooks/        # Custom React hooks
├── pages/        # Page components
│   ├── Auth/     # Authentication pages
│   ├── Dashboard/# Main dashboard
│   └── Trading/  # Trading interface
├── store/        # Zustand state stores
├── utils/        # Utility functions
├── ws/           # WebSocket clients
└── App.jsx       # Main application component
```

## Key Features

### Trading Interface
- **Real-time Dashboard**: Live account balance, equity, and P&L
- **Position Management**: View and manage open positions
- **Order Management**: Place and modify orders
- **Trade History**: Complete trading history with analytics
- **Watchlists**: Custom symbol watchlists with real-time prices

### Charts & Analysis
- **Interactive Charts**: Drag to pan, scroll to zoom, touch gestures
- **Multiple Timeframes**: M1, M5, M15, H1, H4, D1
- **Technical Indicators**: EMA, SMA, RSI, MACD
- **Real-time Updates**: Live price ticks and candle updates

### Account Management
- **Multi-Account Support**: Manage multiple MT5 accounts
- **Broker Integration**: Support for multiple brokers
- **2FA Security**: Two-factor authentication setup
- **Profile Management**: User settings and preferences

### PWA Features
- **Offline Support**: Works without internet connection
- **Push Notifications**: Price alerts and trade notifications
- **App Installation**: Install as native app on desktop/mobile
- **Background Sync**: Sync data when connection restored

## Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues

# Testing
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run coverage     # Generate coverage report
```

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Build
```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

## PWA Configuration

The app is configured as a Progressive Web App with:
- **Service Worker**: Caches resources for offline use
- **Web App Manifest**: Defines app metadata and icons
- **Install Prompts**: Guides users to install the app
- **Offline Pages**: Custom offline and error pages

### PWA Features
- Install on desktop and mobile devices
- Offline functionality for cached data
- Push notifications (when implemented)
- Background sync capabilities

## Performance Optimizations

- **Code Splitting**: Route-based lazy loading
- **Bundle Optimization**: Vite's optimized build process
- **Image Optimization**: Responsive images and lazy loading
- **Caching Strategy**: Intelligent API response caching
- **Virtual Scrolling**: Efficient rendering of large lists

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## License

MIT License - see LICENSE file for details.