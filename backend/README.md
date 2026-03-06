# Backend API Server

Backend API server for the Luxe Threads e-commerce platform.

## Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── index.ts         # Entry point
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase project with database set up

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
API_BASE_URL=http://localhost:3001/api

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=30m
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products?category=<slug>` - Get products by category
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:slug` - Get category by slug
- `POST /api/categories` - Create category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)

### Authentication
- `POST /api/auth/signup` - Sign up new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

## Database Schema

The backend expects the following Supabase tables:

- `products` - Product catalog
- `categories` - Product categories
- `product_variants` - Product variants (sizes, colors, mockup images)
- `user_profiles` - User profiles with roles

See `backend-backup/db-migrations/` for database schema details.

