# Sync Status & Health Check Guide

This guide explains how to monitor your sync system and troubleshoot any issues.

## Quick Health Check

### Using the Health Check Endpoint

Check the overall health of your sync system:

```bash
curl -X GET https://your-vercel-domain.vercel.app/api/health-check
```

**Response Example (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-28T10:30:45.123Z",
  "checks": {
    "database": { "status": "ok", "message": "Database connection successful" },
    "usersTable": { "status": "ok", "userCount": 6, "message": "Table has 6 users" },
    "environment": { "status": "ok", "hasGoogleApiKey": true, "hasCronSecret": true, "hasDatabaseUrl": true }
  }
}
```

## Monitoring Sync Status

### Manual Sync Trigger

Trigger a sync manually:

```bash
curl -X POST \
  https://your-vercel-domain.vercel.app/api/sync-users \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Success Response:**
```json
{
  "success": true,
  "message": "User sync completed successfully",
  "syncedCount": 6,
  "skippedCount": 0,
  "totalRows": 6,
  "durationMs": 1234,
  "timestamp": "2025-12-28T10:30:45.123Z",
  "requestId": "sync-1735387845123-abc123"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "GOOGLE_API_KEY environment variable is required",
  "durationMs": 45,
  "timestamp": "2025-12-28T10:30:45.123Z",
  "requestId": "sync-1735387845123-abc123"
}
```

## Automatic Sync (Cron Job)

The system automatically syncs users every 1 minute via Vercel cron job.

### Vercel Cron Configuration

Defined in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/sync-users",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

### View Cron Logs

1. Go to Vercel Dashboard
2. Select your project (journey-connect-neni)
3. Click "Deployments" → Latest deployment
4. Click "Logs" tab
5. Filter by "Cron" to see sync job executions

## Troubleshooting

### Issue: Users Not Syncing

**Step 1: Check Health**
```bash
curl https://your-vercel-domain.vercel.app/api/health-check
```

**Step 2: Check Environment Variables in Vercel**
- Go to Vercel Dashboard → Settings → Environment Variables
- Verify these exist:
  - `GOOGLE_API_KEY` - Your Google Sheets API key
  - `CRON_SECRET` - Secret for securing cron endpoint
  - `POSTGRES_URL` - Your Neon database URL

**Step 3: Check Database**
Query Neon console to see current user count:
```sql
SELECT COUNT(*) FROM users;
```

**Step 4: Check Google Sheets**
- Open your Google Sheet
- Verify the 'Users' tab has data in columns A-D
- Columns: phoneNumber | pin | name | role

**Step 5: Manual Sync Test**
Trigger a manual sync and check the response:
```bash
curl -X POST \
  https://your-vercel-domain.vercel.app/api/sync-users \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Common Errors

#### 401 Unauthorized
**Cause:** Invalid or missing CRON_SECRET
**Solution:** 
1. Get correct CRON_SECRET from Vercel Environment Variables
2. Include it in Authorization header: `Authorization: Bearer YOUR_SECRET`

#### 403 Forbidden (Database)
**Cause:** Database connection failed
**Solution:**
1. Check Vercel has correct POSTGRES_URL
2. Verify Neon database is running
3. Check IP whitelist in Neon settings

#### Google Sheets API Error
**Cause:** Invalid API key or sheet not accessible
**Solution:**
1. Verify GOOGLE_API_KEY is valid in Vercel
2. Check Google Cloud API is enabled
3. Verify sheet ID is correct

## Monitoring Best Practices

1. **Check Health Daily**: Add /api/health-check to your monitoring
2. **Review Logs**: Check Vercel logs weekly for errors
3. **Verify Counts**: Compare database user count with Google Sheet rows
4. **Test Manual Sync**: Manually trigger sync after adding new users
5. **Monitor Timing**: Track sync duration in responses

## Performance Tips

- **Sync Frequency**: Currently set to every 1 minute (*/1 * * * *)
- **Batch Processing**: Sync processes up to 50 rows per second
- **Timeout**: 30-second timeout per sync operation
- **Retries**: Up to 3 automatic retries with exponential backoff

## Support

If sync issues persist:
1. Check all environment variables are set
2. Verify Google Sheets API key is active
3. Review Vercel deployment logs
4. Check database query logs in Neon
5. Contact support with sync request ID from response
