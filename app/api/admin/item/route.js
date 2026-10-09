import { query } from '@/lib/db';
import { withAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { logActivity } from '@/lib/audit';

// GET ?ruanganId=... : daftar SEMUA item (termasuk nonaktif) di ruangan tsb.
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const ruanganId = searchParams.get('ruanganId');
  if (!ruanganId) return jsonError('ruanganId wajib diisi.');

  const res = await query(
    `select id, urutan, nama, satuan, jumlah_standar, aktif, exp_date, no_batch
     from master_item where ruangan_id = $1 order by urutan, nama`,
    [ruanganId]
  );
  return jsonOk({ items: res.rows });
});

// POST: tambah item baru ke ruangan tertentu.
export const POST = withAuth(async (req, ctx, session) => {
  const { ruanganId, nama, satuan, jumlahStandar, expDate, noBatch } = await req.json();
  const namaTrim = (nama || '').trim();
  if (!ruanganId || !namaTrim) return jsonError('Ruangan & nama obat/alat wajib diisi.');

  const urutanRes = await query(
    `select coalesce(max(urutan), 0) + 1 as next from master_item where ruangan_id = $1`,
    [ruanganId]
  );

  try {
    const res = await query(
      `insert into master_item (ruangan_id, urutan, nama, satuan, jumlah_standar, exp_date, no_batch)
       values ($1,$2,$3,$4,$5,$6,$7)
       returning id, urutan, nama, satuan, jumlah_standar, aktif, exp_date, no_batch`,
      [ruanganId, urutanRes.rows[0].next, namaTrim, (satuan || '').trim(), Number(jumlahStandar) || 0,
       expDate || null, (noBatch || '').trim() || null]
    );
    await logActivity(session, 'buat_item', `${namaTrim}`);
    return jsonOk({ item: res.rows[0] });
  } catch (err) {
    if (err.code === '23505') return jsonError(`"${namaTrim}" sudah ada di ruangan ini.`);
    throw err;
  }
});