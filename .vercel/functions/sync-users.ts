/**
 * Vercel Edge Function for user synchronization (Vite-compatible)
 * Uses standard Web API instead of Next.js imports
 * Runs globally for low-latency syncing
 */

import { sql } from '@vercel/postgres';

const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 30000,
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '1J7ca-cB-oTOaoUWH2gAPi3gHHYTizZtwyn-mp41qndI',
  SHEET_NAME: 'Users',
};

// Retry logic with exponential backoff
async function fetchWithRetry(url: string, retries = CONFIG.MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      timeout: CONFIG.TIMEOUT,
    });
    return response;
  } catch (error) {
    if (retries > 0) {
      const delay = CONFIG.RETRY_DELAY * (CONFIG.MAX_RETRIES - retries + 1);
      console.log(`[EDGE-SYNC] Retry after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

export default async function handler(request: Request) {
  const syncStartTime = Date.now();
  const requestId = `edge-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Only allow POST and GET requests
  if (request.method !== 'POST' && request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify authorization (required for POST)
    if (request.method === 'POST') {
      const authHeader = request.headers.get('authorization');
      const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
      if (authHeader !== expectedAuth) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[${requestId}] Edge Sync initiated`);

    // Fetch Google Sheets data
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    const RANGE = `${CONFIG.SHEET_NAME}!A2:D`;
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.GOOGLE_SHEETS_ID}/values/${RANGE}?key=${apiKey}`;
    console.log(`[${requestId}] Fetching from Google Sheets`);

    const sheetResponse = await fetchWithRetry(sheetsUrl);
    if (!sheetResponse.ok) {
      throw new Error(`Failed to fetch sheet: ${sheetResponse.statusText}`);
    }

    const data = await sheetResponse.json() as { values?: string[][] };
    const rows = data.values || [];

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No data to sync',
          syncedCount: 0,
          skippedCount: 0,
          requestId,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sync rows to database
    let syncedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; phone: string; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row || row.length === 0) {
        skippedCount++;
        continue;
      }

      const [phoneNumber, pin, name, role] = row;

      if (!phoneNumber || phoneNumber.toString().trim() === '') {
        skippedCount++;
        continue;
      }

      try {
        const normalizedPhone = phoneNumber.toString().trim();
        const normalizedRole = (role || 'USER').toString().trim().toUpperCase();
        const normalizedPin = (pin || '').toString().trim();
        const normalizedName = (name || '').toString().trim();

        // Validate phone format
        if (!/^\d+$/.test(normalizedPhone)) {
          throw new Error('Invalid phone format');
        }

        // Upsert to database
        await sql`
          INSERT INTO users (phone_number, pin, name, role)
          VALUES (${normalizedPhone}, ${normalizedPin}, ${normalizedName || null}, ${normalizedRole})
          ON CONFLICT (phone_number) DO UPDATE
          SET pin = EXCLUDED.pin, name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW()
        `;

        syncedCount++;
        console.log(`[${requestId}] Synced ${normalizedPhone}`);
      } catch (err) {
        skippedCount++;
        errors.push({
          row: i + 1,
          phone: phoneNumber,
          error: err instanceof Error ? err.message : String(err),
        });
        console.error(`[${requestId}] Row ${i + 1} error:`, err);
      }
    }

    const duration = Date.now() - syncStartTime;
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed',
        syncedCount,
        skippedCount,
        totalRows: rows.length,
        durationMs: duration,
        requestId,
        ...(errors.length > 0 && { errors }),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const duration = Date.now() - syncStartTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Sync failed:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        durationMs: duration,
        requestId,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const config = {
  runtime: 'edge',
};
