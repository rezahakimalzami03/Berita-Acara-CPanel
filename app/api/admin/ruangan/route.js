import { query } from '@/lib/db';
import { withAuth, withAdminAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { logActivity } from '@/lib/audit';

// GET: daftar SEMUA ruangan (termasuk nonaktif) — utk halaman kelola.
export const GET = withAuth(async (req, ctx, session) => {
  // admin: semua ruangan; petugas: hanya ruangan yang diizinkan admin
  const isAdmin = session.user.role === 'admin';
  const res = await query(
    `select r.id, r.nama, r.aktif,
            (select count(*)::int from master_item mi where mi.ruangan_id = r.id and mi.aktif = true) as jumlah_item
     from ruangan r
     where $1::boolean or r.id in (select ruangan_id from user_ruangan where user_id = $2)
     order by r.nama`,
    [isAdmin, session.user.id]
  );
  return jsonOk({ ruangan: res.rows });
});

// POST: tambah ruangan baru — HANYA admin
export const POST = withAdminAuth(async (req, ctx, session) => {
  const { nama } = await req.json();
  const namaTrim = (nama || '').trim();
  if (!namaTrim) return jsonError('Nama ruangan wajib diisi.');

  try {
    const res = await query(
      `insert into ruangan (nama) values ($1) returning id, nama, aktif`,
      [namaTrim]
    );
    await logActivity(session, 'buat_ruangan', namaTrim);
    return jsonOk({ ruangan: res.rows[0] });
  } catch (err) {
    if (err.code === '23505') return jsonError(`Ruangan "${namaTrim}" sudah ada.`);
    throw err;
  }
});