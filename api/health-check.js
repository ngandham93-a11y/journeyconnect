import { sql } from '@vercel/postgres';

/**
 * Health check endpoint for sync system monitoring
 * Provides detailed status information about database and sync health
 */
export default async function handler(req, res) {
  const checkTime = new Date();
  const health = {
    status: 'healthy',
    timestamp: checkTime.toISOString(),
    checks: {},
  };

  try {
    // Check database connection
    try {
      console.log('[HEALTH] Checking database connection...');
      const dbResult = await sql`SELECT 1 as ok`;
      health.checks.database = { status: 'ok', message: 'Database connection successful' };
    } catch (dbError) {
      health.status = 'unhealthy';
      health.checks.database = { 
        status: 'error', 
        message: dbError instanceof Error ? dbError.message : String(dbError),
      };
    }

    // Check users table
    try {
      console.log('[HEALTH] Checking users table...');
      const countResult = await sql`SELECT COUNT(*) as count FROM users`;
      const userCount = countResult.rows[0]?.count || 0;
      health.checks.usersTable = {
        status: 'ok',
        userCount: parseInt(userCount),
        message: `Table has ${userCount} users`,
      };
    } catch (tableError) {
      health.status = 'unhealthy';
      health.checks.usersTable = {
        status: 'error',
        message: tableError instanceof Error ? tableError.message : String(tableError),
      };
    }

    // Check environment variables
    const envCheck = {
      hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
      hasCronSecret: !!process.env.CRON_SECRET,
      hasDatabaseUrl: !!process.env.POSTGRES_URL,
    };
    health.checks.environment = {
      status: (envCheck.hasGoogleApiKey && envCheck.hasCronSecret && envCheck.hasDatabaseUrl) ? 'ok' : 'warning',
      ...envCheck,
    };

    console.log('[HEALTH] Health check completed:', health);
    return res.status(200).json(health);
  } catch (error) {
    console.error('[HEALTH] Unexpected error:', error);
    health.status = 'unhealthy';
    health.error = error instanceof Error ? error.message : String(error);
    return res.status(500).json(health);
  }
}
