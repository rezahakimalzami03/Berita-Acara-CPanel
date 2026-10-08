import { query } from '@/lib/db';
import { withAuth, jsonOk, jsonError } from '@/lib/api-helpers';

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const ruanganId = searchParams.get('ruanganId');
  const dari = searchParams.get('dari');
  const sampai = searchParams.get('sampai');
  if (!ruanganId) return jsonError('ruanganId wajib diisi.');
  if (!dari || !sampai) return jsonError('dari & sampai wajib diisi.');

  const ruanganRes = await query('select id, nama from ruangan where id = $1', [ruanganId]);
  if (ruanganRes.rows.length === 0) return jsonError('Ruangan tidak ditemukan.', 404);
  const ruangan = ruanganRes.rows[0];

  const perItemRes = await query(
    `select l.nama, l.satuan,
            max(l.jumlah_standar) as jumlah_standar,
            coalesce(sum(l.jumlah_terpakai), 0)::numeric as total_terpakai,
            count(*) as jumlah_transaksi
     from log_pemakaian l
     where l.ruangan_id = $1 and l.tanggal_kejadian between $2 and $3
     group by l.nama, l.satuan
     order by total_terpakai desc, l.nama`,
    [ruanganId, dari, sampai]
  );

  const dailyRes = await query(
    `select to_char(d.day, 'YYYY-MM-DD') as tanggal,
            coalesce(sum(l.jumlah_terpakai), 0)::numeric as total
     from generate_series($2::date, $3::date, interval '1 day') as d(day)
     left join log_pemakaian l on l.tanggal_kejadian = d.day and l.ruangan_id = $1
     group by d.day order by d.day`,
    [ruanganId, dari, sampai]
  );

  const detailsRes = await query(
    `select l.tanggal_kejadian as tanggal, l.nama, l.satuan, l.jumlah_terpakai as jumlah,
            l.nama_pasien, l.no_rm
     from log_pemakaian l
     where l.ruangan_id = $1 and l.tanggal_kejadian between $2 and $3 and l.jumlah_terpakai > 0
     order by l.tanggal_kejadian desc, l.nama
     limit 500`,
    [ruanganId, dari, sampai]
  );

  const baCountRes = await query(
    `select count(distinct berita_acara_id)::int as jumlah_ba
     from log_pemakaian
     where ruangan_id = $1 and tanggal_kejadian between $2 and $3`,
    [ruanganId, dari, sampai]
  );

  const perItem = perItemRes.rows.map((r) => ({
    nama: r.nama,
    satuan: r.satuan,
    jumlahStandar: Number(r.jumlah_standar),
    totalTerpakai: Number(r.total_terpakai),
    jumlahTransaksi: Number(r.jumlah_transaksi),
  }));
  const daily = dailyRes.rows.map((r) => ({ tanggal: r.tanggal, total: Number(r.total) }));
  const details = detailsRes.rows.map((r) => ({
    tanggal: r.tanggal.toISOString().slice(0, 10),
    nama: r.nama,
    satuan: r.satuan,
    jumlah: Number(r.jumlah),
    namaPasien: r.nama_pasien,
    noRm: r.no_rm,
  }));

  const totalPemakaian = perItem.reduce((s, p) => s + p.totalTerpakai, 0);
  const used = perItem.filter((p) => p.totalTerpakai > 0);
  const itemTerbanyak = used.length ? used.reduce((a, b) => (b.totalTerpakai > a.totalTerpakai ? b : a)) : null;
  const jumlahBA = baCountRes.rows[0]?.jumlah_ba || 0;

  return jsonOk({
    ruangan,
    summary: { totalPemakaian, itemTerbanyak, jumlahBA, jumlahJenisItem: perItem.length },
    perItem,
    daily,
    details,
  });
});
