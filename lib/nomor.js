import { query } from './db';

const ROMAN_BULAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const TIPE_KODE = { Pembukaan: 'PB', Penutupan: 'PT' };
export const RS_CODE = process.env.RS_CODE || 'RSUA';

/**
 * Hitung nomor urut berikutnya per Jenis, reset tiap tahun (berdasarkan
 * tanggal_kejadian) — padanan persis dari computeNomorBA() di Code.gs.
 */
export async function computeNomorBA(tanggal, jenis) {
  const tgl = new Date(tanggal);
  const year = tgl.getFullYear();
  const res = await query(
    `select count(*)::int as jumlah from berita_acara
     where jenis = $1 and extract(year from tanggal_kejadian) = $2`,
    [jenis, year]
  );
  const seq = String(res.rows[0].jumlah + 1).padStart(3, '0');
  const romawi = ROMAN_BULAN[tgl.getMonth()];
  const tipeKode = TIPE_KODE[jenis] || 'XX';
  return `${seq}/TE-${tipeKode}/${RS_CODE}/${romawi}/${year}`;
}

export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export function tanggalIndo(tanggal) {
  const tgl = new Date(tanggal);
  return `${HARI[tgl.getDay()]}, tanggal ${tgl.getDate()} bulan ${BULAN[tgl.getMonth()]} tahun ${tgl.getFullYear()}`;
}
