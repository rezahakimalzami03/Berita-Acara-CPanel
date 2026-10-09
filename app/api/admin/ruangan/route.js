import { query } from '@/lib/db';
import { withAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { logActivity } from '@/lib/audit';

// GET: daftar SEMUA ruangan (termasuk nonaktif) — utk halaman kelola.
export const GET = withAuth(async () => {
  const res = await query(
    `select r.id, r.nama, r.aktif,
            (select count(*)::int from master_item mi where mi.ruangan_id = r.id and mi.aktif = true) as jumlah_item
     from ruangan r order by r.nama`
  );
  return jsonOk({ ruangan: res.rows });
});

// POST: tambah ruangan baru
export const POST = withAuth(async (req, ctx, session) => {
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