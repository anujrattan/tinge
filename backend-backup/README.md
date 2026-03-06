# Backend API Server

Backend API server for the Luxe Threads e-commerce platform.

## Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── index.ts         # Entry point
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
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

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/luxe_threads
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Gelato Print-on-Demand API Configuration
GELATO_API_KEY=your-gelato-api-key
GELATO_STORE_ID=your-gelato-store-id
GELATO_API_BASE_URL=https://api.gelato.com
GELATO_WEBHOOK_SECRET=your-gelato-webhook-secret
```

See `GELATO_SETUP.md` for detailed Gelato integration setup instructions.

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/category/:slug` - Get products by category
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Categories
- `GET /api/categories` - Get all categories

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order by ID

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout

### Gelato Integration (Admin Only)
- `GET /api/gelato/test` - Test Gelato API connection
- `GET /api/gelato/products` - Get Gelato product catalog
- `GET /api/gelato/products/search` - Search Gelato products
- `GET /api/gelato/products/:productUid/availability` - Check product availability
- `GET /api/gelato/regions` - Get available shipping regions
- `GET /api/gelato/orders` - Get orders from Gelato
- `GET /api/gelato/orders/:orderReferenceId` - Get order status
- `POST /api/gelato/orders` - Create order in Gelato

## TODO

- [ ] Implement Express.js server
- [ ] Set up database (PostgreSQL/MongoDB)
- [ ] Implement authentication middleware
- [ ] Add request validation
- [ ] Add error handling
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Add unit tests
- [ ] Add integration tests

