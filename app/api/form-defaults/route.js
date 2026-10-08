import { query } from '@/lib/db';
import { withAuth, jsonOk, jsonError } from '@/lib/api-helpers';

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const ruanganId = searchParams.get('ruanganId');
  const jenis = searchParams.get('jenis');
  if (!ruanganId || !jenis) return jsonError('ruanganId & jenis wajib diisi');

  const itemsRes = await query(
    `select nama, satuan, jumlah_standar from master_item
     where ruangan_id = $1 and aktif = true order by urutan, nama`,
    [ruanganId]
  );

  let sisaMap = new Map();
  if (jenis === 'Penutupan') {
    const sisaRes = await query(
      `select nama, sisa_stok from v_sisa_stok_terakhir where ruangan_id = $1`,
      [ruanganId]
    );
    sisaRes.rows.forEach((r) => sisaMap.set(r.nama, Number(r.sisa_stok)));
  }

  const items = itemsRes.rows.map((r, i) => ({
    no: i + 1,
    nama: r.nama,
    satuan: r.satuan,
    kolomD: jenis === 'Pembukaan' ? Number(r.jumlah_standar) : (sisaMap.has(r.nama) ? sisaMap.get(r.nama) : Number(r.jumlah_standar)),
    kolomE: '',
    keterangan: '',
  }));

  const labelD = jenis === 'Penutupan' ? 'Sisa Stok (Pembukaan Terakhir)' : 'Jml. Standar';
  const labelE = jenis === 'Pembukaan' ? 'Jml. Terpakai' : 'Jml. Aktual';

  return jsonOk({ items, labelD, labelE });
});
