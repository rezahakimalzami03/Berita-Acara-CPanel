import { query } from '@/lib/db';
import { withAdminAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { logActivity } from '@/lib/audit';

// PATCH: ubah nama dan/atau status aktif ruangan.
export const PATCH = withAdminAuth(async (req, { params }, session) => {
  const { id } = await params;
  const { nama, aktif } = await req.json();

  const fields = [];
  const values = [];
  if (nama !== undefined) { values.push(nama.trim()); fields.push(`nama = $${values.length}`); }
  if (aktif !== undefined) { values.push(aktif); fields.push(`aktif = $${values.length}`); }
  if (fields.length === 0) return jsonError('Tidak ada perubahan dikirim.');

  values.push(id);
  try {
    const res = await query(
      `update ruangan set ${fields.join(', ')} where id = $${values.length} returning id, nama, aktif`,
      values
    );
    if (!res.rows[0]) return jsonError('Ruangan tidak ditemukan.', 404);
    await logActivity(session, 'edit_ruangan', res.rows[0].nama);
    return jsonOk({ ruangan: res.rows[0] });
  } catch (err) {
    if (err.code === '23505') return jsonError('Nama ruangan sudah dipakai.');
    throw err;
  }
});

// DELETE: soft-delete (set aktif=false) — TIDAK menghapus data historis
// (berita_acara/log_pemakaian yang sudah ada tetap aman, hanya ruangan ini
// tidak lagi muncul di dropdown pilihan ruangan untuk dokumen BARU).
export const DELETE = withAdminAuth(async (req, { params }, session) => {
  const { id } = await params;
  const res = await query(`update ruangan set aktif = false where id = $1 returning id, nama`, [id]);
  if (!res.rows[0]) return jsonError('Ruangan tidak ditemukan.', 404);
  await logActivity(session, 'nonaktif_ruangan', res.rows[0].nama);
  return jsonOk({ deleted: true });
});