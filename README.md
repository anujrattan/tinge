# Luxe Threads - Premium Apparel Store

A modern, single-brand e-commerce store for premium apparel and accessories, featuring a full shopping experience from browsing products to checkout, and a simple admin panel for product management.

## Project Structure

```
luxe-threads---premium-apparel-store/
├── frontend/          # React + TypeScript + Vite frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Utility functions and constants
│   │   ├── styles/        # Global styles and CSS
│   │   ├── App.tsx        # Main application component
│   │   └── index.tsx      # Application entry point
│   ├── public/            # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/           # Backend API server (placeholder)
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Data models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions
│   │   └── index.ts       # Entry point
│   ├── package.json
│   └── tsconfig.json
│
└── README.md          # This file
```

## Features

### Frontend
- ✅ Product catalog with categories
- ✅ Product detail pages with variants (sizes/colors)
- ✅ Shopping cart with localStorage persistence
- ✅ Checkout flow with form validation
- ✅ Admin panel for product management (CRUD)
- ✅ Responsive design with Tailwind CSS
- ✅ Modern UI with animations and transitions

### Backend (Planned)
- ⏳ RESTful API endpoints
- ⏳ Database integration
- ⏳ Authentication & authorization
- ⏳ Order processing
- ⏳ Payment integration

## Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**

### Quick Start (Recommended)

1. Install all dependencies (root, frontend, and backend):
```bash
npm run install:all
```

2. Set up environment variables:
   - Frontend: Copy `frontend/.env.example` to `frontend/.env.local` and update values
   - Backend: Copy `backend/.env.example` to `backend/.env` and update values

3. Start both frontend and backend in watch mode:
```bash
npm run dev
```

This will start:
- **Frontend** at `http://localhost:3000` (with hot reload)
- **Backend** at `http://localhost:3001` (with watch mode)

The output will be color-coded:
- 🟦 **FRONTEND** logs in cyan
- 🟪 **BACKEND** logs in magenta

### Individual Setup

#### Frontend Only

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your configuration:
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_ADMIN_PASSWORD=admin123
```

5. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

#### Backend Only

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/luxe_threads
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

5. Start the development server:
```bash
npm run dev
```

The backend will be available at `http://localhost:3001`

## Available Scripts

### Root Level (Run from project root)

- `npm run dev` - Start both frontend and backend in watch mode (recommended)
- `npm run dev:frontend` - Start only frontend in watch mode
- `npm run dev:backend` - Start only backend in watch mode
- `npm run build` - Build both frontend and backend for production
- `npm run build:frontend` - Build only frontend
- `npm run build:backend` - Build only backend
- `npm run install:all` - Install dependencies for root, frontend, and backend
- `npm run lint` - Run linting for both frontend and backend
- `npm run lint:frontend` - Run linting for frontend only
- `npm run lint:backend` - Run linting for backend only
- `npm run clean` - Remove all node_modules and dist folders

### Frontend (Run from `frontend/` directory)

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend (Run from `backend/` directory)

- `npm run dev` - Start development server with watch mode
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack

### Frontend
- **React** 19.2.0 - UI library
- **TypeScript** 5.8.2 - Type safety
- **Vite** 6.2.0 - Build tool
- **Tailwind CSS** 3.4.14 - Styling

### Backend (Planned)
- **Node.js** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL/MongoDB** - Database (TBD)

## Project Architecture

### Frontend Architecture
- **Component-based**: Reusable UI components
- **Service layer**: API abstraction
- **Type safety**: Full TypeScript coverage
- **State management**: React hooks (local state)
- **Routing**: Custom page state management (can be upgraded to React Router)

### Backend Architecture (Planned)
- **RESTful API**: Standard HTTP methods
- **Layered architecture**: Controllers → Services → Models
- **Middleware**: Authentication, validation, error handling
- **Database**: ORM/ODM for data persistence

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow React best practices
- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks

### File Naming
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Types: `index.ts` in types directory
- Constants: `constants.ts` or `config.ts`

### Git Workflow
- Create feature branches from `main`
- Write descriptive commit messages
- Keep commits focused and atomic
- Review code before merging

## Environment Variables

### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_ADMIN_PASSWORD=admin123
VITE_GEMINI_API_KEY=your_key_here  # Optional
```

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/luxe_threads
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGIN=http://localhost:3000
```

## Security Notes

⚠️ **Important**: This is a development/demo project. For production:

1. **Never commit** `.env` files
2. Use strong, unique secrets for `JWT_SECRET` and `ADMIN_PASSWORD`
3. Implement proper authentication (JWT tokens, refresh tokens)
4. Add rate limiting and request validation
5. Use HTTPS in production
6. Implement CSRF protection
7. Sanitize all user inputs
8. Use environment-specific configurations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please contact the development team.

---

**Note**: The backend is currently a placeholder structure. Full implementation is planned for future development.
