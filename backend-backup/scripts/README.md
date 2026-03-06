# Admin User Creation Script

This script allows you to programmatically create admin users in the system.

## Prerequisites

1. Ensure your `.env` file in the `backend/` directory contains:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Run the database migration first:
   ```bash
   # Run migration 004_create_user_profiles_table.sql
   ```

## Usage

```bash
cd backend
node scripts/create-admin-user.js <email> <password> [name]
```

### Examples

```bash
# Create admin with email and password
node scripts/create-admin-user.js admin@example.com securePassword123

# Create admin with email, password, and name
node scripts/create-admin-user.js admin@example.com securePassword123 "Admin User"
```

## What the Script Does

1. Creates a new user in Supabase Auth
2. Creates/updates the user profile in the `user_profiles` table
3. Sets the user's role to `admin`
4. Auto-confirms the email (for development)

## Important Notes

- **Password must be at least 6 characters long**
- If a user with the email already exists, the script will provide instructions to update their role manually
- Admin users can:
  - Shop on the site (like regular users)
  - Access the admin panel at `/admin`
  - Manage products and categories

## Manual Role Update

If you need to update an existing user to admin:

```sql
UPDATE user_profiles SET role = 'admin' WHERE email = 'user@example.com';
```

## Security

- Only use this script in development or secure environments
- Never commit admin credentials to version control
- Change default admin passwords immediately after creation

