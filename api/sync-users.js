import { sql } from '@vercel/postgres';

// Configuration
const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 30000,
  BATCH_SIZE: 50,
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '1J7ca-cB-oTOaoUWH2gAPi3gHHYTizZtwyn-mp41qndI',
  SHEET_NAME: 'Users',
};

// Retry logic with exponential backoff
async function fetchWithRetry(url, options = {}, retries = CONFIG.MAX_RETRIES) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (retries > 0) {
      const delay = CONFIG.RETRY_DELAY * (CONFIG.MAX_RETRIES - retries + 1);
      console.log(`[SYNC] Retry attempt ${CONFIG.MAX_RETRIES - retries + 1}/${CONFIG.MAX_RETRIES} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Health check before sync
async function healthCheck() {
  try {
    console.log('[HEALTH] Checking database connection...');
    const result = await sql`SELECT 1 as ok`;
    console.log('[HEALTH] Database connection OK');
    return true;
  } catch (error) {
    console.error('[HEALTH] Database connection failed:', error);
    return false;
  }
}

// Fetch Google Sheets data with retry
async function fetchSheetData(apiKey, sheetId) {
  const RANGE = `${CONFIG.SHEET_NAME}!A2:D`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${RANGE}?key=${apiKey}`;
  
  console.log('[SYNC] Fetching data from Google Sheets...');
  const response = await fetchWithRetry(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.values || [];
}

// Process and sync rows in batches
async function syncUserRows(rows) {
  let syncedCount = 0;
  let skippedCount = 0;
  const errors = [];
  
  console.log(`[SYNC] Processing ${rows.length} rows...`);
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Skip empty rows
    if (!row || row.length === 0) {
      skippedCount++;
      continue;
    }
    
    const [phoneNumber, pin, name, role] = row;
    
    // Skip if phone number is empty
    if (!phoneNumber || phoneNumber.toString().trim() === '') {
      skippedCount++;
      continue;
    }
    
    try {
      const normalizedPhone = phoneNumber.toString().trim();
      const normalizedRole = (role || 'USER').toString().trim().toUpperCase();
      const normalizedPin = (pin || '').toString().trim();
      const normalizedName = (name || '').toString().trim();
      
      // Validate phone number format
      if (!/^\d+$/.test(normalizedPhone)) {
        throw new Error('Invalid phone number format');
      }
      
      // Upsert user (insert or update if exists)
      await sql`
        INSERT INTO users (phone_number, pin, name, role)
        VALUES (
          ${normalizedPhone},
          ${normalizedPin},
          ${normalizedName || null},
          ${normalizedRole}
        )
        ON CONFLICT (phone_number) DO UPDATE
        SET
          pin = EXCLUDED.pin,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          updated_at = NOW()
      `;
      
      syncedCount++;
      console.log(`[SYNC] Row ${i + 1}: ✓ Synced ${normalizedPhone}`);
    } catch (err) {
      skippedCount++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push({
        row: i + 1,
        phone: phoneNumber,
        error: errorMsg,
      });
      console.error(`[SYNC] Row ${i + 1}: ✗ Error - ${errorMsg}`);
    }
  }
  
  return { syncedCount, skippedCount, errors };
}

export default async function handler(req, res) {
  const syncStartTime = Date.now();
  const requestId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`\n[${requestId}] SYNC REQUEST INITIATED`);
  
  try {
    // Verify the cron secret for security
    const authHeader = req.headers.authorization;
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      console.error(`[${requestId}] Unauthorized access attempt`);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        requestId,
      });
    }
    
    // Health check
    const isHealthy = await healthCheck();
    if (!isHealthy) {
      return res.status(503).json({
        success: false,
        error: 'Database connection failed',
        requestId,
      });
    }
    
    // Validate API key
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }
    
    // Fetch sheet data
    const rows = await fetchSheetData(apiKey, CONFIG.GOOGLE_SHEETS_ID);
    
    if (rows.length === 0) {
      console.log(`[${requestId}] No data found in sheet`);
      return res.status(200).json({
        success: true,
        message: 'No data to sync',
        syncedCount: 0,
        skippedCount: 0,
        timestamp: new Date().toISOString(),
        requestId,
      });
    }
    
    // Process rows
    const { syncedCount, skippedCount, errors } = await syncUserRows(rows);
    
    const duration = Date.now() - syncStartTime;
    const summary = {
      success: true,
      message: 'User sync completed successfully',
      syncedCount,
      skippedCount,
      totalRows: rows.length,
      durationMs: duration,
      timestamp: new Date().toISOString(),
      requestId,
      errors: errors.length > 0 ? errors : undefined,
    };
    
    console.log(`[${requestId}] SYNC COMPLETED:`, summary);
    return res.status(200).json(summary);
  } catch (error) {
    const duration = Date.now() - syncStartTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorLog = {
      success: false,
      error: errorMsg,
      durationMs: duration,
      timestamp: new Date().toISOString(),
      requestId,
    };
    
    console.error(`[${requestId}] SYNC FAILED:`, error);
    return res.status(500).json(errorLog);
  }
}
