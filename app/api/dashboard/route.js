import { query } from '@/lib/db';
import { withAuth, jsonOk, jsonError } from '@/lib/api-helpers';

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const dari = searchParams.get('dari');
  const sampai = searchParams.get('sampai');
  if (!dari || !sampai) return jsonError('dari & sampai wajib diisi.');

  const perRuanganRes = await query(
    `select r.nama as ruangan, coalesce(sum(l.jumlah_terpakai), 0)::numeric as total
     from ruangan r
     left join log_pemakaian l on l.ruangan_id = r.id and l.tanggal_kejadian between $1 and $2
     where r.aktif = true
     group by r.nama order by total desc`,
    [dari, sampai]
  );

  const perObatRes = await query(
    `select mi.nama, coalesce(sum(l.jumlah_terpakai), 0)::numeric as total
     from (select distinct nama from master_item where aktif = true) mi
     left join log_pemakaian l on l.nama = mi.nama and l.tanggal_kejadian between $1 and $2
     group by mi.nama order by total desc`,
    [dari, sampai]
  );

  const dailyRes = await query(
    `select to_char(d.day, 'YYYY-MM-DD') as tanggal, coalesce(sum(l.jumlah_terpakai), 0)::numeric as total
     from generate_series($1::date, $2::date, interval '1 day') as d(day)
     left join log_pemakaian l on l.tanggal_kejadian = d.day
     group by d.day order by d.day`,
    [dari, sampai]
  );

  const detailsRes = await query(
    `select l.tanggal_kejadian as tanggal, r.nama as ruangan, l.nama, l.satuan, l.jumlah_terpakai as jumlah
     from log_pemakaian l join ruangan r on r.id = l.ruangan_id
     where l.tanggal_kejadian between $1 and $2 and l.jumlah_terpakai > 0
     order by l.tanggal_kejadian, r.nama, l.nama limit 1000`,
    [dari, sampai]
  );

  const perRuangan = perRuanganRes.rows.map((r) => ({ ruangan: r.ruangan, total: Number(r.total) }));
  const perObat = perObatRes.rows.map((r) => ({ nama: r.nama, total: Number(r.total) }));
  const daily = dailyRes.rows.map((r) => ({ tanggal: r.tanggal, total: Number(r.total) }));
  const details = detailsRes.rows.map((r) => ({
    tanggal: r.tanggal.toISOString().slice(0, 10), ruangan: r.ruangan, nama: r.nama, satuan: r.satuan, jumlah: Number(r.jumlah),
  }));

  const totalAll = perRuangan.reduce((s, p) => s + p.total, 0);
  const topUnit = perRuangan.length ? perRuangan.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const used = perObat.filter((p) => p.total > 0);
  const topObat = used.length ? used.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const bottomObat = used.length ? used.reduce((a, b) => (b.total < a.total ? b : a)) : null;
  const zeroCount = perObat.length - used.length;

  return jsonOk({
    summary: { totalAll, topUnit, topObat, bottomObat, zeroCount },
    perRuangan, perObat, daily, details,
  });
});
