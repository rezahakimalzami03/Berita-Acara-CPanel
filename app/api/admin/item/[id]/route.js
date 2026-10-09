import { query } from '@/lib/db';
import { withAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { logActivity } from '@/lib/audit';

// PATCH: ubah nama/satuan/jumlah_standar/aktif/exp_date/no_batch satu item.
export const PATCH = withAuth(async (req, { params }, session) => {
  const { id } = await params;
  const { nama, satuan, jumlahStandar, aktif, expDate, noBatch } = await req.json();

  const fields = [];
  const values = [];
  if (nama !== undefined) { values.push(nama.trim()); fields.push(`nama = $${values.length}`); }
  if (satuan !== undefined) { values.push(satuan.trim()); fields.push(`satuan = $${values.length}`); }
  if (jumlahStandar !== undefined) { values.push(Number(jumlahStandar) || 0); fields.push(`jumlah_standar = $${values.length}`); }
  if (aktif !== undefined) { values.push(aktif); fields.push(`aktif = $${values.length}`); }
  if (expDate !== undefined) { values.push(expDate || null); fields.push(`exp_date = $${values.length}`); }
  if (noBatch !== undefined) { values.push((noBatch || '').trim() || null); fields.push(`no_batch = $${values.length}`); }
  if (fields.length === 0) return jsonError('Tidak ada perubahan dikirim.');

  values.push(id);
  try {
    const res = await query(
      `update master_item set ${fields.join(', ')} where id = $${values.length}
       returning id, urutan, nama, satuan, jumlah_standar, aktif, exp_date, no_batch`,
      values
    );
    if (!res.rows[0]) return jsonError('Item tidak ditemukan.', 404);
    await logActivity(session, 'edit_item', res.rows[0].nama);
    return jsonOk({ item: res.rows[0] });
  } catch (err) {
    if (err.code === '23505') return jsonError('Nama item sudah ada di ruangan ini.');
    throw err;
  }
});

// DELETE: soft-delete (aktif=false) — riwayat dokumen lama yang sudah memuat
// item ini TIDAK terpengaruh (berita_acara_item tersimpan sbg snapshot terpisah).
export const DELETE = withAuth(async (req, { params }, session) => {
  const { id } = await params;
  const res = await query(`update master_item set aktif = false where id = $1 returning id, nama`, [id]);
  if (!res.rows[0]) return jsonError('Item tidak ditemukan.', 404);
  await logActivity(session, 'nonaktif_item', res.rows[0].nama);
  return jsonOk({ deleted: true });
});