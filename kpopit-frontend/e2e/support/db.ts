import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';
import { BACKEND_DIR } from './env';

// Locally the E2E DB is kpopit_pre_major_patch, a copy of production with real users: DB_URL is read
// from kpopit-backend/.env at runtime and never printed, and tests only touch catalog rows and their
// own users. CI (and any other seeded DB) sets E2E_DB_URL + E2E_DB_NAME; the backend gets the same URL.
const EXPECTED_DB = process.env.E2E_DB_NAME ?? 'kpopit_pre_major_patch';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

let pool: pg.Pool | null = null;

function connectionString(): string {
  const url = process.env.E2E_DB_URL ?? dotenv.parse(fs.readFileSync(path.join(BACKEND_DIR, '.env'))).DB_URL;
  if (!url) throw new Error('DB_URL is not set in kpopit-backend/.env');
  const u = new URL(url);
  const dbName = u.pathname.replace(/^\//, '');
  if (!LOCAL_HOSTS.has(u.hostname) || dbName !== EXPECTED_DB) {
    throw new Error(`E2E helpers only connect to the local ${EXPECTED_DB} database.`);
  }
  return url;
}

function db(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: connectionString(), max: 2 });
  return pool;
}

export async function closeDb(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
}

export const GAMEMODE = { classic: 1, blurry: 2, pixelated: 3 } as const;
export type ModeName = keyof typeof GAMEMODE;

// From daily_picks, not the API payload, which will stop exposing the answer (T40/T90).
export async function dailyPick(mode: ModeName, date: string): Promise<number> {
  const col = mode === 'pixelated' ? 'album_id' : 'idol_id';
  const { rows } = await db().query(
    `SELECT ${col} AS id FROM daily_picks WHERE pick_date = $1 AND gamemode_id = $2`,
    [date, GAMEMODE[mode]],
  );
  if (!rows[0]?.id) throw new Error(`No ${mode} pick in daily_picks for ${date}`);
  return rows[0].id as number;
}

export async function albumName(albumId: number): Promise<string> {
  const { rows } = await db().query('SELECT name FROM albums WHERE id = $1', [albumId]);
  return rows[0].name as string;
}

export async function userIdByUsername(username: string): Promise<number> {
  const { rows } = await db().query('SELECT id FROM users WHERE username = $1', [username]);
  if (!rows[0]) throw new Error('test user not found');
  return rows[0].id as number;
}

export async function userIdByToken(token: string): Promise<number> {
  const { rows } = await db().query('SELECT id FROM users WHERE token = $1', [token]);
  if (!rows[0]) throw new Error('test user not found');
  return rows[0].id as number;
}

export async function userIdolCard(
  userId: number,
  idolId: number,
): Promise<{ level: number; times_won: number } | null> {
  const { rows } = await db().query(
    `SELECT uc.level, uc.times_won
       FROM user_cards uc JOIN cards c ON c.id = uc.card_id
      WHERE uc.user_id = $1 AND c.idol_id = $2 AND c.card_type = 'idol'`,
    [userId, idolId],
  );
  return rows[0] ? { level: rows[0].level, times_won: rows[0].times_won } : null;
}

// A real repeat win needs the same idol picked again on another day; owning the card
// from an "earlier day" lets today's win exercise the level-up path.
export async function seedIdolCard(userId: number, idolId: number, level = 1, timesWon = 1): Promise<void> {
  await db().query(
    `INSERT INTO user_cards (user_id, card_id, level, times_won, first_won_at)
     SELECT $1, c.id, $3, $4, NOW() - INTERVAL '2 days'
       FROM cards c WHERE c.idol_id = $2 AND c.card_type = 'idol' AND c.collection_id = 1`,
    [userId, idolId, level, timesWon],
  );
}

export async function idolHasCard(idolId: number): Promise<boolean> {
  const { rows } = await db().query(
    `SELECT 1 FROM cards WHERE idol_id = $1 AND card_type = 'idol' LIMIT 1`,
    [idolId],
  );
  return rows.length > 0;
}

export async function userHistory(userId: number, mode: ModeName) {
  const { rows } = await db().query(
    'SELECT * FROM user_history WHERE user_id = $1 AND gamemode_id = $2',
    [userId, GAMEMODE[mode]],
  );
  return rows[0] ?? null;
}

export async function dailyHistory(userId: number, mode: ModeName) {
  const { rows } = await db().query(
    `SELECT date::text AS date, won, guesses_count, score
       FROM daily_user_history WHERE user_id = $1 AND gamemode_id = $2 ORDER BY date`,
    [userId, GAMEMODE[mode]],
  );
  return rows;
}

// Only ever called on users the test just created; the JWT picks it up on the next refresh.
export async function makeAdmin(userId: number): Promise<void> {
  await db().query('UPDATE users SET is_admin = TRUE WHERE id = $1', [userId]);
}

export async function setUsernameChangedAt(userId: number, daysAgo: number): Promise<void> {
  await db().query(
    `UPDATE users SET username_changed_at = NOW() - make_interval(days => $2) WHERE id = $1`,
    [userId, daysAgo],
  );
}
