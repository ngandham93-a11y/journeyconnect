/**
 * Script to import users from Google Sheets to Postgres database
 * 
 * SETUP INSTRUCTIONS:
 * 1. Get your Postgres connection string from Vercel
 * 2. Get your Google Sheets API credentials from Google Cloud Console
 * 3. Set POSTGRES_URL and GOOGLE_SHEETS_ID environment variables
 * 4. Run: npx ts-node scripts/import-users.ts
 */

import { sql } from '@vercel/postgres';

// Your Google Sheets ID (from URL)
const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1J7ca-cB-oTOaoUWH2gAPi3gHHYTizZtwyn-mp41qndI';
const SHEET_NAME = 'Users';
const RANGE = `${SHEET_NAME}!A2:D`;

interface User {
  phoneNumber: string;
  pin: string;
  name: string;
  role: string;
}

async function importUsersFromSheets() {
  try {
    console.log('Starting user import from Google Sheets...');
    console.log(`Sheet ID: ${SHEET_ID}`);

    // Fetch data from Google Sheets using the public API
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${apiKey}`;
    console.log(`Fetching from: ${url.split('?')[0]}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      console.log('No data found in sheet');
      return;
    }

    console.log(`Found ${rows.length} rows to import`);

    let importedCount = 0;
    let skippedCount = 0;

    // Import each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const [phoneNumber, pin, name, role] = row;

      // Skip if phone number is empty
      if (!phoneNumber || phoneNumber.trim() === '') {
        console.log(`Row ${i + 1}: Skipped (no phone number)`);
        skippedCount++;
        continue;
      }

      try {
        // Normalize phone number (remove spaces/dashes)
        const normalizedPhone = phoneNumber.toString().trim();
        const normalizedRole = (role || 'USER').toString().trim().toUpperCase();

        // Upsert user (insert or update if exists)
        await sql`
          INSERT INTO users (phone_number, pin, name, role)
          VALUES (
            ${normalizedPhone},
            ${pin ? pin.toString().trim() : ''},
            ${name ? name.toString().trim() : null},
            ${normalizedRole}
          )
          ON CONFLICT (phone_number) DO UPDATE
          SET
            pin = EXCLUDED.pin,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            updated_at = NOW()
        `;

        importedCount++;
        console.log(`Row ${i + 1}: Imported ${normalizedPhone}`);
      } catch (err) {
        skippedCount++;
        console.error(`Row ${i + 1}: Error importing ${phoneNumber}:`, err);
      }
    }

    console.log(`\n=== Import Summary ===`);
    console.log(`Total rows processed: ${rows.length}`);
    console.log(`Successfully imported: ${importedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`\n✅ Import complete!`);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Run the import
importUsersFromSheets();
