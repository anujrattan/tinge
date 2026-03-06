# Database Migrations

This directory contains SQL migration and seed scripts for the Supabase database.

## Structure

- `001_create_categories_table.sql` - Creates the categories table with indexes and RLS policies
- `002_seed_categories.sql` - Seeds the categories table with dummy data
- `005_create_products_table.sql` - Creates the products table with foreign key to categories
- `006_seed_products.sql` - Seeds the products table with dummy data from hardcoded frontend data
- `007_add_sale_fields_to_products.sql` - Adds on_sale boolean and sale_discount_percentage fields for sale items

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `001_create_categories_table.sql`
4. Click **Run** to execute the migration
5. Repeat for `002_seed_categories.sql` to seed the data

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run specific migration
supabase db execute -f 001_create_categories_table.sql
supabase db execute -f 002_seed_categories.sql
```

### Option 3: Using psql or Database Client

If you have direct database access:

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migrations
\i 001_create_categories_table.sql
\i 002_seed_categories.sql
```

## Migration Order

Always run migrations in numerical order:

1. `001_create_categories_table.sql` - Must run first (creates categories table)
2. `002_seed_categories.sql` - Seeds categories with dummy data (run after table creation)
3. `003_setup_storage_bucket.sql` - Sets up storage bucket policies (optional, for image uploads)
4. `005_create_products_table.sql` - Creates products table with foreign key to categories (requires categories table)
5. `006_seed_products.sql` - Seeds products with dummy data (requires categories and products tables)
6. `007_add_sale_fields_to_products.sql` - Adds sale fields to products table (requires products table)

## Storage Bucket Setup

For image uploads to work, you need to:

1. **Create Storage Bucket** (via Supabase Dashboard):

   - Go to **Storage** → **Create Bucket**
   - Name: `category-images`
   - Public: **Yes** (for public image access)
   - File size limit: 5MB (or as needed)
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

2. **Set up Policies** (via SQL Editor):
   - Run `003_setup_storage_bucket.sql` to create RLS policies
   - Or set up policies manually via Dashboard → Storage → Policies

## Verifying the Migration

After running the migrations, verify the data:

```sql
-- Check table exists
SELECT * FROM categories LIMIT 5;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'categories';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'categories';
```

## Cache Synchronization

After running migrations, the cache will be automatically populated on the first API request:

1. **First Request**: Cache miss → Fetch from DB → Store in Redis cache
2. **Subsequent Requests**: Cache hit → Return from Redis (fast)
3. **CRUD Operations**: Update DB → Invalidate/Update cache → Keep in sync

## Notes

- The seed script uses `ON CONFLICT DO NOTHING` to prevent duplicate entries
- UUIDs are explicitly set for consistency, but you can use `DEFAULT uuid_generate_v4()` if preferred
- The migration includes automatic `updated_at` timestamp updates via trigger
- RLS policies allow public read access but require service role for writes

## Troubleshooting

### Error: "relation already exists"

- The table already exists. You can either:
  - Drop and recreate: `DROP TABLE categories CASCADE;` then re-run migration
  - Or skip the CREATE TABLE part and only run the seed script

### Error: "duplicate key value violates unique constraint"

- The seed data already exists. This is handled by `ON CONFLICT DO NOTHING`
- To re-seed, first truncate: `TRUNCATE TABLE categories CASCADE;`

### Cache not updating

- Clear Redis cache: `redis-cli FLUSHDB` (development only)
- Or restart your backend server to reconnect to Redis
