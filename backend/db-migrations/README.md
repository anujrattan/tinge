# Database Migrations

This directory contains SQL migration scripts for the Supabase database.

## Migration Files

- `001_setup_product_variants_for_mockups.sql` - Sets up product_variants table with size, color, and mockup_images columns
- `002_add_qikink_sku_to_product_variants.sql` - Adds qikink_sku column to product_variants table for Qikink integration
- `003_create_orders_tables.sql` - Creates orders, order_items, addresses, and payments tables for order management

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of the migration file
4. Click **Run** to execute the migration
5. Repeat for each migration file in order

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run specific migration
supabase db execute -f 001_setup_product_variants_for_mockups.sql
```

### Option 3: Using psql or Database Client

If you have direct database access:

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migrations
\i 001_setup_product_variants_for_mockups.sql
```

## Migration Order

Always run migrations in numerical order:

1. `001_setup_product_variants_for_mockups.sql` - Must run first (creates product_variants table structure)
2. `002_add_qikink_sku_to_product_variants.sql` - Adds Qikink SKU column (requires product_variants table)
3. `003_create_orders_tables.sql` - Creates order management tables (requires products and product_variants tables)

## Order Management Tables

The `003_create_orders_tables.sql` migration creates the following tables:

- **orders** - Main order records with order numbers, status, and payment information
- **order_items** - Individual items in each order
- **addresses** - Shipping and billing addresses for orders
- **payments** - Payment records (Razorpay integration ready)

All tables include proper indexes, RLS policies, and foreign key constraints.
