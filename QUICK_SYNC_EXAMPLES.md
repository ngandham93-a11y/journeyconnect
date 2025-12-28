# Quick Sync Examples - Copy & Paste Ready

## ⚡ Fastest Way to Trigger Sync

Replace `your_cron_secret_123` with your actual CRON_SECRET value and run:

### Copy-Paste Command (Linux/Mac Terminal):
```bash
curl -X GET "https://www.journeyconnect.in/api/sync-users" -H "Authorization: Bearer your_cron_secret_123"
```

### Copy-Paste Command (Windows PowerShell):
```powershell
Invoke-WebRequest -Uri "https://www.journeyconnect.in/api/sync-users" -Headers @{"Authorization"="Bearer your_cron_secret_123"} -Method Get
```

---

## How to Get Your CRON_SECRET

1. Open Vercel Dashboard: https://vercel.com
2. Go to Project: `journey-connect-neni`
3. Click Settings → Environment Variables
4. Look for `CRON_SECRET`
5. Copy the value
6. Paste it in the commands above (replace `your_cron_secret_123`)

---

## JavaScript (Browser Console)

Open your browser's developer console (F12) and paste this:

```javascript
fetch('https://www.journeyconnect.in/api/sync-users', {
  method: 'GET',
  headers: {'Authorization': 'Bearer your_cron_secret_123'}
})
.then(r => r.json())
.then(d => {
  console.log('✓ Sync Success:', d.success);
  console.log('📊 Synced:', d.syncedCount, 'users');
  console.log('⏱️ Time:', d.durationMs, 'ms');
})
.catch(e => console.error('Error:', e));
```

---

## Python (Save as `sync.py`)

```python
import requests

url = 'https://www.journeyconnect.in/api/sync-users'
headers = {'Authorization': 'Bearer your_cron_secret_123'}

r = requests.get(url, headers=headers).json()
print(f"✓ Success: {r['success']}")
print(f"📊 Synced: {r['syncedCount']} users")
print(f"⏱️ Time: {r['durationMs']}ms")
```

Run with: `python sync.py`

---

## Node.js (Save as `sync.js`)

```javascript
const fetch = require('node-fetch');

fetch('https://www.journeyconnect.in/api/sync-users', {
  headers: {'Authorization': 'Bearer your_cron_secret_123'}
})
.then(r => r.json())
.then(d => {
  console.log('✓ Success:', d.success);
  console.log('📊 Synced:', d.syncedCount, 'users');
  console.log('⏱️ Time:', d.durationMs, 'ms');
});
```

Run with: `node sync.js`

---

## Using Postman

1. Open Postman
2. New Request → GET
3. URL: `https://www.journeyconnect.in/api/sync-users`
4. Headers tab → Add:
   - Key: `Authorization`
   - Value: `Bearer your_cron_secret_123`
5. Click Send
6. View JSON response

---

## Success Response Example

```json
{
  "success": true,
  "message": "User sync completed",
  "syncedCount": 4,
  "skippedCount": 0,
  "totalRows": 4,
  "durationMs": 245,
  "timestamp": "2025-12-28T16:30:00.000Z"
}
```

---

## Error Response Example

**401 Unauthorized** (Wrong secret):
```json
{"error": "Unauthorized"}
```

**500 Error** (Missing API key):
```json
{"success": false, "error": "GOOGLE_API_KEY environment variable is required"}
```

---

## Automated Scheduling (Optional)

### Using cron-job.org (Free)

1. Go to https://cron-job.org
2. Sign up (free)
3. Create new cron job
4. Execution URL: `https://www.journeyconnect.in/api/sync-users`
5. Request method: GET
6. Add custom header:
   - Name: `Authorization`
   - Value: `Bearer your_cron_secret_123`
7. Schedule: Every 10 minutes (or your preference)
8. Save

### Using GitHub Actions (Free)

Create `.github/workflows/sync-users.yml`:

```yaml
name: Sync Users
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X GET "https://www.journeyconnect.in/api/sync-users" \
            -H "Authorization: Bearer your_cron_secret_123"
```

---

## Troubleshooting

### "Unauthorized" error
- Check CRON_SECRET value is correct
- Make sure it starts with `Bearer ` in the header

### "GOOGLE_API_KEY not found"
- Verify it's set in Vercel Environment Variables
- Check for typos

### No users synced
- Verify Google Sheet has data in columns A-D
- Check for empty phone numbers in column A

---

## Need Help?

See `MANUAL_SYNC_GUIDE.md` for detailed documentation with all methods and troubleshooting steps.
