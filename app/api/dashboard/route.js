import { query } from '@/lib/db';
import { withAuth, jsonOk, jsonError, allowedRuanganIds } from '@/lib/api-helpers';

export const GET = withAuth(async (req, ctx, session) => {
  const { searchParams } = new URL(req.url);
  const dari = searchParams.get('dari');
  const sampai = searchParams.get('sampai');
  if (!dari || !sampai) return jsonError('dari & sampai wajib diisi.');
  const allowed = await allowedRuanganIds(session); // null = admin (semua ruangan)

  const perRuanganRes = await query(
    `select r.nama as ruangan, coalesce(sum(l.jumlah_terpakai), 0)::numeric as total
     from ruangan r
     left join log_pemakaian l on l.ruangan_id = r.id and l.tanggal_kejadian between $1 and $2
     where r.aktif = true and ($3::uuid[] is null or r.id = any($3))
     group by r.nama order by total desc`,
    [dari, sampai, allowed]
  );

  const perObatRes = await query(
    `select mi.nama, coalesce(sum(l.jumlah_terpakai), 0)::numeric as total
     from (select distinct nama from master_item where aktif = true and ($3::uuid[] is null or ruangan_id = any($3))) mi
     left join log_pemakaian l on l.nama = mi.nama and l.tanggal_kejadian between $1 and $2
          and ($3::uuid[] is null or l.ruangan_id = any($3))
     group by mi.nama order by total desc`,
    [dari, sampai, allowed]
  );

  const dailyRes = await query(
    `select to_char(d.day, 'YYYY-MM-DD') as tanggal, coalesce(sum(l.jumlah_terpakai), 0)::numeric as total
     from generate_series($1::date, $2::date, interval '1 day') as d(day)
     left join log_pemakaian l on l.tanggal_kejadian = d.day and ($3::uuid[] is null or l.ruangan_id = any($3))
     group by d.day order by d.day`,
    [dari, sampai, allowed]
  );

  const detailsRes = await query(
    `select l.tanggal_kejadian as tanggal, r.nama as ruangan, l.nama, l.satuan, l.jumlah_terpakai as jumlah
     from log_pemakaian l join ruangan r on r.id = l.ruangan_id
     where l.tanggal_kejadian between $1 and $2 and l.jumlah_terpakai > 0
       and ($3::uuid[] is null or l.ruangan_id = any($3))
     order by l.tanggal_kejadian, r.nama, l.nama limit 1000`,
    [dari, sampai, allowed]
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
