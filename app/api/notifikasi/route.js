import { query } from '@/lib/db';
import { withAuth, jsonOk } from '@/lib/api-helpers';

// GET: dipakai semua user (petugas + admin) — bukan cuma admin, supaya
// petugas di lapangan juga bisa lihat kalau ada obat yang perlu direstock.
export const GET = withAuth(async () => {
  // ---- Stok kosong / menipis: dari sisa stok TERBARU per (ruangan, nama) ----
  // dibandingkan dengan jumlah_standar yang berlaku saat itu. sisa <= 0
  // dianggap "kosong". Hanya dihitung utk item yang masih aktif di master.
  const stokRes = await query(
    `select v.ruangan_id, r.nama as ruangan, v.nama, v.satuan, v.sisa_stok, v.jumlah_standar, v.tanggal_kejadian
     from v_sisa_stok_terakhir v
     join ruangan r on r.id = v.ruangan_id
     join master_item mi on mi.ruangan_id = v.ruangan_id and mi.nama = v.nama and mi.aktif = true
     where v.sisa_stok <= 0
     order by r.nama, v.nama`
  );

  // ---- Sudah expired, <= 30 hari lagi, ATAU exp di bulan kalender yang sama (dari master_item.exp_date) ----
  const expRes = await query(
    `select mi.id, r.nama as ruangan, mi.nama, mi.satuan, mi.no_batch, mi.exp_date,
            (mi.exp_date < current_date) as sudah_expired,
            (mi.exp_date - current_date)::int as sisa_hari,
            (date_trunc('month', mi.exp_date) = date_trunc('month', current_date)) as bulan_ini,
            to_char(mi.exp_date, 'DD/MM/YYYY') as exp_fmt
     from master_item mi
     join ruangan r on r.id = mi.ruangan_id
     where mi.aktif = true and mi.exp_date is not null
       and (
         mi.exp_date <= current_date + interval '30 days'
         or date_trunc('month', mi.exp_date) = date_trunc('month', current_date)
       )
     order by mi.exp_date asc`
  );

  const stokKosong = stokRes.rows.map((r) => ({
    ruangan: r.ruangan,
    nama: r.nama,
    satuan: r.satuan,
    sisaStok: Number(r.sisa_stok),
    jumlahStandar: Number(r.jumlah_standar),
    tanggalTerakhir: r.tanggal_kejadian.toISOString().slice(0, 10).split('-').reverse().join('/'),
  }));

  const kadaluarsa = expRes.rows.map((r) => ({
    id: r.id,
    ruangan: r.ruangan,
    nama: r.nama,
    satuan: r.satuan,
    noBatch: r.no_batch,
    expDate: r.exp_fmt,
    sudahExpired: r.sudah_expired,
    sisaHari: r.sisa_hari,
    bulanIni: r.bulan_ini,
  }));

  return jsonOk({
    stokKosong,
    kadaluarsa,
    totalNotifikasi: stokKosong.length + kadaluarsa.length,
  });
});