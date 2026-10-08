import { query } from './db';

/**
 * Catat 1 baris aktivitas ke audit_log. Dipanggil "best-effort" — kalau
 * gagal (misal tabel belum ada karena migrasi belum dijalankan), cukup
 * dicatat ke console, TIDAK melempar error, supaya aksi utama (buat BA,
 * buat user, dst) tetap berhasil walau logging-nya gagal.
 *
 * @param {object} session - session dari withAuth/withAdminAuth (berisi user.id, user.name)
 * @param {string} aksi - kode aksi singkat, contoh: 'buat_ba', 'hapus_ba'
 * @param {string} detail - deskripsi singkat & manusiawi, contoh: 'Nomor 001/... (IGD)'
 */
export async function logActivity(session, aksi, detail) {
  try {
    await query(
      `insert into audit_log (user_id, username, aksi, detail) values ($1, $2, $3, $4)`,
      [session?.user?.id || null, session?.user?.name || null, aksi, detail || null]
    );
  } catch (err) {
    console.error('Gagal mencatat audit_log (diabaikan):', aksi, err.message);
  }
}