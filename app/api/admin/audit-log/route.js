import { query } from '@/lib/db';
import { withAdminAuth, jsonOk } from '@/lib/api-helpers';

const AKSI_LABEL = {
  buat_ba: 'Buat Berita Acara',
  hapus_ba: 'Hapus Berita Acara',
  buat_user: 'Buat User',
  edit_user: 'Ubah User',
  nonaktif_user: 'Nonaktifkan User',
  buat_item: 'Tambah Item Master',
  edit_item: 'Ubah Item Master',
  nonaktif_item: 'Nonaktifkan Item Master',
  buat_ruangan: 'Tambah Ruangan',
  edit_ruangan: 'Ubah Ruangan',
  nonaktif_ruangan: 'Nonaktifkan Ruangan',
};

export const GET = withAdminAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const aksi = searchParams.get('aksi') || '';
  const limit = Number(searchParams.get('limit')) || 50;
  const offset = Number(searchParams.get('offset')) || 0;

  const conditions = [];
  const params = [];
  if (aksi) { params.push(aksi); conditions.push(`aksi = $${params.length}`); }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';

  const totalRes = await query(`select count(*)::int as total from audit_log ${where}`, params);
  const total = totalRes.rows[0].total;

  params.push(limit, offset);
  const rowsRes = await query(
    `select id, username, aksi, detail, created_at from audit_log
     ${where} order by created_at desc limit $${params.length - 1} offset $${params.length}`,
    params
  );

  const rows = rowsRes.rows.map((r) => ({
    id: r.id,
    username: r.username || '(tidak diketahui)',
    aksi: r.aksi,
    aksiLabel: AKSI_LABEL[r.aksi] || r.aksi,
    detail: r.detail,
    timestamp: new Date(r.created_at).toLocaleString('id-ID'),
  }));

  return jsonOk({ rows, total, aksiOptions: AKSI_LABEL });
});