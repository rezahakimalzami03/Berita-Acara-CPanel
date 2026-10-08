import { query } from '@/lib/db';
import { withAdminAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { deleteFileByUrl } from '@/lib/storage';
import { logActivity } from '@/lib/audit';

// DELETE: hapus total 1 Berita Acara yang salah input, supaya petugas bisa
// input ulang dari awal. Menghapus baris di tabel berita_acara akan otomatis
// ikut menghapus baris terkait di berita_acara_item & log_pemakaian (lihat
// "on delete cascade" di db/schema.sql), sehingga rekap/dashboard juga ikut
// bersih dari data yang salah tsb. File Word/PDF/tanda tangan di Supabase
// Storage juga dihapus (best-effort, tidak menggagalkan proses kalau gagal).
export const DELETE = withAdminAuth(async (req, { params }, session) => {
  const { id } = await params;

  const res = await query(
    `select docx_url, pdf_url, petugas1_ttd_url, petugas2_ttd_url, kepala_ttd_url, nomor
     from berita_acara where id = $1`,
    [id]
  );
  const ba = res.rows[0];
  if (!ba) return jsonError('Berita Acara tidak ditemukan.', 404);

  await query('delete from berita_acara where id = $1', [id]);

  // Best-effort: hapus file terkait di Storage (tidak melempar error kalau gagal)
  await Promise.all([
    deleteFileByUrl(ba.docx_url),
    deleteFileByUrl(ba.pdf_url),
    deleteFileByUrl(ba.petugas1_ttd_url),
    deleteFileByUrl(ba.petugas2_ttd_url),
    deleteFileByUrl(ba.kepala_ttd_url),
  ]);
  await logActivity(session, 'hapus_ba', `Nomor ${ba.nomor}`);
  return jsonOk({ deleted: true, nomor: ba.nomor });
});