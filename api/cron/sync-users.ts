/**
 * Cron Job: Sync users from Google Sheets to Postgres
 * Runs every 1 minute automatically on Vercel
 *
 * Endpoint: /api/cron/sync-users
 * Method: GET
 * Auth: Uses CRON_SECRET environment variable
 */

import { sql } from '@vercel/postgres';

// Google Sheet Configuration
const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1J7ca-cB-oTOaoUWH2gAPi3gHHYTizZtwyn-mp41qndI';
const SHEET_NAME = 'Users';
const RANGE = `${SHEET_NAME}!A2:D`;

export async function handler(req: any, res: any) {
  try {
    // Verify the cron secret for security
    const authHeader = req.headers.authorization || req.headers.get?.('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[SYNC] Starting user sync from Google Sheets...');
    const startTime = Date.now();

    // Fetch data from Google Sheets
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${apiKey}`;
    const sheetResponse = await fetch(url);
    
    if (!sheetResponse.ok) {
      throw new Error(`Failed to fetch sheet: ${sheetResponse.statusText}`);
    }

    const data = await sheetResponse.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      console.log('[SYNC] No data found in sheet');
      return res.status(200).json({
        success: true,
        message: 'No data to sync',
        syncedCount: 0,
        skippedCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[SYNC] Found ${rows.length} rows to process`);
    let syncedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Sync each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
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
        console.log(`[SYNC] Row ${i + 1}: Synced ${normalizedPhone}`);
      } catch (err) {
        skippedCount++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Row ${i + 1}: ${phoneNumber} - ${errorMsg}`);
        console.error(`[SYNC] Row ${i + 1}: Error syncing ${phoneNumber}:`, err);
      }
    }

    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      message: 'User sync completed',
      syncedCount,
      skippedCount,
      totalRows: rows.length,
      durationMs: duration,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('[SYNC] Sync completed:', summary);
    return res.status(200).json(summary);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SYNC] Sync failed:', error);
    return res.status(500).json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }
}
