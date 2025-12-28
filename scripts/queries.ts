/**
 * Database query helpers for users table
 * Import these functions in your API routes to query the Postgres database
 */

import { sql } from '@vercel/postgres';

export interface User {
  id: number;
  phone_number: string;
  pin: string;
  name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all users from the database
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await sql<User>`SELECT * FROM users ORDER BY created_at DESC`;
    return result.rows;
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
}

/**
 * Get user by phone number
 */
export async function getUserByPhone(phoneNumber: string): Promise<User | null> {
  try {
    const result = await sql<User>
      `SELECT * FROM users WHERE phone_number = ${phoneNumber}`;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await sql<User>`SELECT * FROM users WHERE id = ${id}`;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

/**
 * Verify user credentials (phone + pin)
 */
export async function verifyUser(phoneNumber: string, pin: string): Promise<User | null> {
  try {
    const result = await sql<User>`
      SELECT * FROM users 
      WHERE phone_number = ${phoneNumber} 
      AND pin = ${pin}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error verifying user:', error);
    throw error;
  }
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: string): Promise<User[]> {
  try {
    const result = await sql<User>`
      SELECT * FROM users 
      WHERE UPPER(role) = ${role.toUpperCase()}
      ORDER BY created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error('Error fetching users by role:', error);
    throw error;
  }
}

/**
 * Insert or update a user
 */
export async function upsertUser(
  phoneNumber: string,
  pin: string,
  name: string | null,
  role: string = 'USER'
): Promise<User> {
  try {
    const result = await sql<User>`
      INSERT INTO users (phone_number, pin, name, role)
      VALUES (${phoneNumber}, ${pin}, ${name}, ${role.toUpperCase()})
      ON CONFLICT (phone_number) DO UPDATE
      SET 
        pin = EXCLUDED.pin,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW()
      RETURNING *
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

/**
 * Delete user by phone number
 */
export async function deleteUserByPhone(phoneNumber: string): Promise<boolean> {
  try {
    const result = await sql`DELETE FROM users WHERE phone_number = ${phoneNumber}`;
    return result.count > 0;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Count total users
 */
export async function countUsers(): Promise<number> {
  try {
    const result = await sql<{ count: number }>`SELECT COUNT(*) as count FROM users`;
    return result.rows[0]?.count || 0;
  } catch (error) {
    console.error('Error counting users:', error);
    throw error;
  }
}
