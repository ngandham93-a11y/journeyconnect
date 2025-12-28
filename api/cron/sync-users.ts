// This file is deprecated and has been removed.
// Vercel crons directly call the .vercel/functions/sync-users.ts Edge Function.
// This file was causing TypeScript build errors due to missing @vercel/postgres module.
// The cron sync logic is now entirely handled by the Edge Function.
