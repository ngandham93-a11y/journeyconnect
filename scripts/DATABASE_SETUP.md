# Database Setup Guide - Journey Connect

This guide explains how to set up and use the Postgres database for managing users in your Journey Connect application.

## What Has Been Done

✅ **Postgres Database Created**: A Neon Postgres database named `journeyconnect-db` has been created and connected to your Vercel project.

✅ **Users Table Created**: The database includes a `users` table with the following structure:
- `id` - Auto-incrementing primary key
- `phone_number` - Unique phone number (main identifier)
- `pin` - User PIN code
- `name` - User's name
- `role` - User role (default: 'USER')
- `created_at` - Timestamp when user was created
- `updated_at` - Timestamp when user was last updated

✅ **Import Script Created**: `scripts/import-users.ts` - Imports user data from your Google Sheets into the Postgres database.

✅ **Query Helpers Created**: `scripts/queries.ts` - Ready-to-use functions for querying the database.

## Running the Import

### Prerequisites

1. **Google Sheets API Access**:
   - Get your API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Google Sheets API
   - Create an API key (not OAuth credentials)

2. **Environment Variables** (set in your `.env.local`):
   ```
   POSTGRES_URL=postgresql://user:password@host/journeyconnect-db
   GOOGLE_API_KEY=your_google_api_key_here
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

### Running the Import Script

```bash
# Run locally to import users from Google Sheets
npx ts-node scripts/import-users.ts
```

The script will:
1. Fetch data from your Google Sheet (Users!A2:D)
2. Parse phone number, pin, name, and role columns
3. Insert or update users in the Postgres database
4. Show a summary of imported/skipped rows

## Using Database Queries in Your App

### Import Query Helpers

In your API routes or server code:

```typescript
import {
  getUserByPhone,
  getUserById,
  verifyUser,
  getAllUsers,
  getUsersByRole,
  upsertUser,
  deleteUserByPhone,
  countUsers
} from './scripts/queries';
```

### Example Usage

```typescript
// Get user by phone number
const user = await getUserByPhone('+919876543210');

// Verify user credentials
const verifiedUser = await verifyUser('+919876543210', '1234');

// Get all users
const allUsers = await getAllUsers();

// Get admins only
const admins = await getUsersByRole('ADMIN');

// Insert or update a user
const newUser = await upsertUser(
  '+919876543210',
  '1234',
  'John Doe',
  'USER'
);

// Count total users
const totalUsers = await countUsers();
```

## Direct Database Access

You can also run SQL queries directly using `@vercel/postgres`:

```typescript
import { sql } from '@vercel/postgres';

// Custom query
const result = await sql`
  SELECT * FROM users 
  WHERE role = 'ADMIN' 
  ORDER BY created_at DESC
`;
```

## Vercel Environment Variables

Your database connection string is already available as `POSTGRES_URL` in your Vercel environment. To use it locally:

1. Go to your Vercel project settings
2. Copy the database connection string
3. Add it to your `.env.local` file:
   ```
   POSTGRES_URL=your_connection_string_here
   ```

## Troubleshooting

### Import Script Issues

**Error: "GOOGLE_API_KEY environment variable is required"**
- Make sure you've set the `GOOGLE_API_KEY` in your `.env.local`
- The key should be a Google Cloud API key, not OAuth credentials

**Error: "Failed to fetch sheet"**
- Verify your Google Sheets ID is correct
- Make sure the sheet is publicly accessible or you have proper permissions
- Check that the Google Sheets API is enabled in Google Cloud Console

**Error: "POSTGRES_URL environment variable is required"**
- Set `POSTGRES_URL` in your `.env.local`
- You can get this from your Vercel project Storage settings

### Database Connection Issues

**Can't connect to database**:
1. Verify `POSTGRES_URL` is set correctly
2. Check your internet connection
3. Ensure the Neon database is running (check Vercel Storage dashboard)

## Next Steps

1. **Set up environment variables** with your Google API key
2. **Run the import script** to populate your database with users from Google Sheets
3. **Integrate queries** into your API routes using the helper functions
4. **Update your authentication logic** to use the Postgres database instead of Google Sheets

## Database Costs

You're using the **Neon Free Plan** which includes:
- 0.5 GB storage
- 100 projects
- 120 CU-hours per project
- Perfect for ~10,000 users

No credit card required, and free tier is generous enough for production use.

## Support

For issues or questions:
- [Neon Documentation](https://neon.tech/docs)
- [Vercel Postgres Documentation](https://vercel.com/docs/storage/postgres)
- [Google Sheets API Guide](https://developers.google.com/sheets/api/guides)
