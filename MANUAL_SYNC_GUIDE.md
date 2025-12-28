# Manual Sync Endpoint Guide

## Overview
This guide explains how to manually trigger the Google Sheets to Postgres sync endpoint for your Journey Connect application.

## What Does the Sync Do?
The sync endpoint:
- Fetches all user data from your Google Sheets "Users" tab (columns: phoneNumber, pin, name, role)
- Inserts or updates users in the Postgres database
- Matches users by phone number (unique key)
- Returns a summary of synced, skipped, and errored users

## Endpoint Details
- **URL**: `https://www.journeyconnect.in/api/sync-users`
- **Method**: GET or POST
- **Authentication**: Requires `Authorization` header with Bearer token
- **Response**: JSON with sync results

## Environment Variables Required
Make sure these are set in Vercel:
1. `GOOGLE_API_KEY` - Your Google Sheets API key
2. `CRON_SECRET` - Authorization token for the endpoint
3. `POSTGRES_PRISMA_URL` or database connection string

## Method 1: Using cURL (Command Line)

### On Mac/Linux/Windows (Git Bash):
```bash
curl -X GET "https://www.journeyconnect.in/api/sync-users" \
  -H "Authorization: Bearer your_cron_secret_123"
```

### Replace `your_cron_secret_123` with your actual CRON_SECRET value

Example with actual secret:
```bash
curl -X GET "https://www.journeyconnect.in/api/sync-users" \
  -H "Authorization: Bearer your_cron_secret_123"
```

## Method 2: Using PowerShell (Windows)

```powershell
$headers = @{
    "Authorization" = "Bearer your_cron_secret_123"
}

Invoke-WebRequest -Uri "https://www.journeyconnect.in/api/sync-users" `
  -Headers $headers -Method Get
```

## Method 3: Using JavaScript/Node.js

### Quick test in browser console:
```javascript
fetch('https://www.journeyconnect.in/api/sync-users', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_cron_secret_123'
  }
})
.then(response => response.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(error => console.error('Error:', error));
```

### Or create a Node.js script:

**sync.js**:
```javascript
const fetch = require('node-fetch');

const syncUsers = async () => {
  try {
    const response = await fetch('https://www.journeyconnect.in/api/sync-users', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer your_cron_secret_123'
      }
    });
    
    const data = await response.json();
    console.log('Sync Result:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`✓ Synced ${data.syncedCount} users`);
      console.log(`✗ Skipped ${data.skippedCount} users`);
    } else {
      console.error('Sync failed:', data.error);
    }
  } catch (error) {
    console.error('Request error:', error);
  }
};

syncUsers();
```

Run it:
```bash
node sync.js
```

## Method 4: Using Postman (Desktop App)

1. Open Postman
2. Create a new GET request
3. URL: `https://www.journeyconnect.in/api/sync-users`
4. Go to "Headers" tab
5. Add header:
   - **Key**: `Authorization`
   - **Value**: `Bearer your_cron_secret_123`
6. Click "Send"
7. View the JSON response

## Method 5: Using Python

**sync.py**:
```python
import requests

url = 'https://www.journeyconnect.in/api/sync-users'
headers = {
    'Authorization': 'Bearer your_cron_secret_123'
}

try:
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    
    print('Sync Result:')
    print(f'Success: {data.get("success")}')
    print(f'Synced: {data.get("syncedCount")} users')
    print(f'Skipped: {data.get("skippedCount")} users')
    print(f'Total: {data.get("totalRows")} rows')
    print(f'Duration: {data.get("durationMs")}ms')
    
    if data.get('errors'):
        print('\nErrors:')
        for error in data.get('errors', []):
            print(f'  - {error}')
except requests.exceptions.RequestException as e:
    print(f'Error: {e}')
```

Run it:
```bash
python sync.py
```

## Expected Response

### Success Response:
```json
{
  "success": true,
  "message": "User sync completed",
  "syncedCount": 4,
  "skippedCount": 0,
  "totalRows": 4,
  "durationMs": 1234,
  "timestamp": "2025-12-28T16:00:00.000Z"
}
```

### Error Response (401 Unauthorized):
```json
{
  "error": "Unauthorized"
}
```

### Error Response (500 Server Error):
```json
{
  "success": false,
  "error": "GOOGLE_API_KEY environment variable is required",
  "timestamp": "2025-12-28T16:00:00.000Z"
}
```

## Troubleshooting

### "Unauthorized" Error
- Check that your CRON_SECRET is correct
- Make sure the Authorization header is formatted as: `Bearer YOUR_SECRET`
- Verify the secret is set in Vercel environment variables

### "GOOGLE_API_KEY not found" Error
- Verify `GOOGLE_API_KEY` is set in Vercel environment variables
- Make sure it's the correct Google Sheets API key value

### "Failed to fetch sheet" Error
- Check that the Google Sheets ID is correct
- Verify the API key has access to Google Sheets API
- Ensure the "Users" sheet exists and has data in columns A-D

### No users synced
- Check the Google Sheet for empty rows
- Verify phone numbers are in column A (not empty)
- Check for any formatting issues in the sheet

## Finding Your CRON_SECRET

1. Go to Vercel Dashboard
2. Open your project: `journey-connect-neni`
3. Go to Settings → Environment Variables
4. Look for `CRON_SECRET`
5. Copy the value (it should look like: `your_cron_secret_123`)

## Finding Your GOOGLE_API_KEY

1. Go to Google Cloud Console
2. Select project: `journey-connect-482609`
3. Go to APIs & Services → Credentials
4. Find the API key named `journey-connect-sheets-sync`
5. Copy the key value

## Scheduling Automated Syncs

Instead of manual triggers, you can:

### Option 1: Use External Cron Service (Recommended)
- **EasyCron** (https://www.easycron.com/)
- **Cron-job.org** (https://cron-job.org/)
- **Upstash** (https://upstash.com/)

Setup:
1. Create an account on service
2. Create new cron job
3. URL: `https://www.journeyconnect.in/api/sync-users`
4. Method: GET
5. Add Header:
   - `Authorization: Bearer your_cron_secret_123`
6. Set frequency (e.g., every 10 minutes)
7. Save

### Option 2: Use GitHub Actions
Create `.github/workflows/sync-users.yml`:
```yaml
name: Sync Users from Google Sheets

on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync endpoint
        run: |
          curl -X GET "https://www.journeyconnect.in/api/sync-users" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Summary

To sync users from Google Sheets to your database:

1. **Get your CRON_SECRET** from Vercel environment variables
2. **Choose a method** (curl, Python, Node.js, Postman, etc.)
3. **Make a GET request** to `https://www.journeyconnect.in/api/sync-users`
4. **Add the Authorization header** with your secret
5. **Check the response** for sync results

That's it! Your Google Sheet data is now synced to Postgres.
