# Cache Architecture

This document describes how the cache system works with the database for categories and products.

## Cache Structure

The Redis cache is organized into separate namespaces for different data types:

### Categories Cache

```
categories:all                    → Array of all categories
category:{slug}                    → Single category by slug
category:id:{id}                   → Single category by ID
```

### Products Cache

```
products:all                       → Array of all products
products:category:{slug}           → Products filtered by category slug
product:{id}                       → Single product by ID
```

## Cache-Aside Pattern

The application uses a **cache-aside** (also called **lazy loading**) pattern:

### Read Flow

1. **Check Cache First**
   - Try to get data from Redis cache
   - If found (cache hit) → Return cached data immediately

2. **Cache Miss**
   - Fetch data from Supabase database
   - Store result in Redis cache with TTL (1 hour default)
   - Return data to client

### Write Flow (CRUD Operations)

#### Create (POST)
1. Insert new record into database
2. Invalidate relevant cache keys:
   - `categories:all` (for categories)
   - `products:all` (for products)
3. Cache the new individual item:
   - `category:{slug}` (for categories)
   - `product:{id}` (for products)

#### Update (PUT)
1. Fetch old data to identify cache keys to invalidate
2. Update record in database
3. Invalidate old cache entries:
   - `categories:all` or `products:all`
   - Individual item cache (by old slug/ID)
4. Update cache with new data:
   - Set new individual item cache
   - Set by-ID cache

#### Delete (DELETE)
1. Fetch data to identify cache keys to invalidate
2. Delete record from database
3. Invalidate all related cache keys:
   - `categories:all` or `products:all`
   - Individual item caches (by slug, ID)

## Cache Synchronization

### Ensuring DB and Cache Stay in Sync

1. **All writes go to DB first** - Database is the source of truth
2. **Cache invalidation on writes** - Always invalidate related cache keys
3. **Cache updates after writes** - Update individual item caches with new data
4. **TTL expiration** - Cache expires after 1 hour, forcing refresh from DB

### Example: Category Update Flow

```typescript
// 1. Get old category to know which cache keys to invalidate
const oldCategory = await supabase.from('categories').select('slug').eq('id', id).single();

// 2. Update in database
const updatedCategory = await supabase.from('categories').update(data).eq('id', id).select().single();

// 3. Invalidate caches
await cache.del('categories:all'); // Invalidate list
if (oldCategory.slug !== updatedCategory.slug) {
  await cache.del(`category:${oldCategory.slug}`); // Invalidate old slug cache
}

// 4. Update cache with new data
await cache.set(`category:${updatedCategory.slug}`, updatedCategory, 3600);
await cache.set(`category:id:${id}`, updatedCategory, 3600);
```

## Cache Keys Reference

### Categories

| Key Pattern | Description | Example |
|------------|-------------|---------|
| `categories:all` | All categories array | `[{id: '1', name: 'T-Shirts', ...}]` |
| `category:{slug}` | Single category by slug | `category:t-shirts` |
| `category:id:{id}` | Single category by ID | `category:id:550e8400-...` |

### Products

| Key Pattern | Description | Example |
|------------|-------------|---------|
| `products:all` | All products array | `[{id: '1', name: 'Tee', ...}]` |
| `products:category:{slug}` | Products by category | `products:category:t-shirts` |
| `product:{id}` | Single product by ID | `product:1` |

## TTL (Time To Live)

- **Default TTL**: 3600 seconds (1 hour)
- **Purpose**: Ensures cache doesn't become stale indefinitely
- **Behavior**: After TTL expires, next request will fetch fresh data from DB

## Error Handling

- **Cache errors are non-fatal**: If Redis is unavailable, the app falls back to database
- **Database is source of truth**: Cache failures don't affect data integrity
- **Graceful degradation**: App continues to work even if cache is down

## Best Practices

1. **Always write to DB first** - Database is the single source of truth
2. **Invalidate before updating** - Clear old cache entries before setting new ones
3. **Cache individual items** - Cache both list and individual items for faster lookups
4. **Use appropriate TTLs** - Balance between freshness and performance
5. **Handle cache failures gracefully** - Never let cache errors break the app

## Monitoring

To check cache status:

```bash
# Connect to Redis
redis-cli

# Check if categories are cached
GET categories:all

# Check specific category
GET category:t-shirts

# List all category keys
KEYS category:*

# Check TTL
TTL categories:all
```

