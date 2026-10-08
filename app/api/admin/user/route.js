import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { withAdminAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { logActivity } from '@/lib/audit';

const ROLES = ['admin', 'petugas'];

// GET: daftar semua user (termasuk yang nonaktif) — utk halaman kelola.
export const GET = withAdminAuth(async (req, ctx, session) => {
  const res = await query(
    `select id, username, nama_lengkap, role, aktif, created_at
     from users order by created_at`
  );
  return jsonOk({ users: res.rows });
});

// POST: buat user baru
export const POST = withAdminAuth(async (req, ctx, session) => {
  const { username, password, namaLengkap, role } = await req.json();

  const usernameTrim = (username || '').trim();
  const namaTrim = (namaLengkap || '').trim();
  const roleFinal = ROLES.includes(role) ? role : 'petugas';

  if (!usernameTrim) return jsonError('Username wajib diisi.');
  if (!password || password.length < 6) return jsonError('Password minimal 6 karakter.');
  if (!namaTrim) return jsonError('Nama lengkap wajib diisi.');

  const hash = await bcrypt.hash(password, 10);

  try {
    const res = await query(
      `insert into users (username, password_hash, nama_lengkap, role)
       values ($1, $2, $3, $4)
       returning id, username, nama_lengkap, role, aktif, created_at`,
      [usernameTrim, hash, namaTrim, roleFinal]
    );
    await logActivity(session, 'buat_user', `${usernameTrim} (${namaTrim}) — role ${roleFinal}`);
    return jsonOk({ user: res.rows[0] });
  } catch (err) {
    if (err.code === '23505') return jsonError(`Username "${usernameTrim}" sudah dipakai.`);
    throw err;
  }
});