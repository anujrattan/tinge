# Frontend Application

React + TypeScript + Vite frontend for Luxe Threads e-commerce platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ProductCard.tsx
│   ├── ui.tsx      # Button, Card, Input components
│   └── icons.tsx   # SVG icon components
│
├── pages/          # Page components
│   ├── HomePage.tsx
│   ├── ProductListPage.tsx
│   ├── ProductDetailPage.tsx
│   ├── CartPage.tsx
│   ├── CheckoutPage.tsx
│   ├── AdminPage.tsx
│   └── ...
│
├── services/       # API service layer
│   └── api.ts      # Mock API (replace with real API calls)
│
├── types/          # TypeScript type definitions
│   └── index.ts
│
├── utils/          # Utility functions
│   └── constants.ts
│
├── styles/         # Global styles
│   └── index.css
│
├── App.tsx         # Main application component
└── index.tsx       # Entry point
```

## Environment Variables

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_ADMIN_PASSWORD=admin123
VITE_GEMINI_API_KEY=your_key_here  # Optional
```

## Features

- ✅ Product browsing and filtering
- ✅ Shopping cart with localStorage
- ✅ Checkout flow
- ✅ Admin panel
- ✅ Responsive design
- ✅ TypeScript type safety

## Tech Stack

- React 19.2.0
- TypeScript 5.8.2
- Vite 6.2.0
- Tailwind CSS 3.4.14

