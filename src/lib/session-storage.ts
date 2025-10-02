/**
 * Simple session storage for interview sessions
 * This persists sessions across serverless function invocations
 *
 * In production, this should be replaced with Redis or a database
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const SESSIONS_DIR = join(process.cwd(), '.sessions');

// Ensure sessions directory exists
async function ensureSessionsDir() {
  if (!existsSync(SESSIONS_DIR)) {
    await mkdir(SESSIONS_DIR, { recursive: true });
  }
}

export async function saveSession(sessionId: string, data: any): Promise<void> {
  await ensureSessionsDir();
  const filePath = join(SESSIONS_DIR, `${sessionId}.json`);
  await writeFile(filePath, JSON.stringify(data), 'utf-8');
}

export async function getSession(sessionId: string): Promise<any | null> {
  try {
    const filePath = join(SESSIONS_DIR, `${sessionId}.json`);
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const filePath = join(SESSIONS_DIR, `${sessionId}.json`);
    const { unlink } = await import('fs/promises');
    await unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
  }
}
