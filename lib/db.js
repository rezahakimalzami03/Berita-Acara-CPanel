import { Pool } from 'pg';

// Koneksi Postgres.
// - Hosting cPanel (Postgres di server yang sama, host "localhost"): TANPA SSL.
// - Supabase / Postgres remote: set DATABASE_SSL=true di environment variables.
// Aplikasi berjalan sebagai proses Node yang hidup terus (cPanel Node.js App),
// jadi pool koneksi kecil sudah cukup.
let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL belum diatur di environment variables.');
    }
    const useSsl =
      process.env.DATABASE_SSL === 'true' ||
      /supabase\.(co|com)/.test(process.env.DATABASE_URL);
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 5,
    });
  }
  return pool;
}

export async function query(text, params) {
  const client = getPool();
  return client.query(text, params);
}
