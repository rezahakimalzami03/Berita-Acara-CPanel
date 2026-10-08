import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { withAdminAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { logActivity } from '@/lib/audit';

const ROLES = ['admin', 'petugas'];

// PATCH: ubah nama lengkap / role / status aktif, dan/atau reset password.
export const PATCH = withAdminAuth(async (req, { params }, session) => {
  const { id } = await params;
  const { namaLengkap, role, aktif, password } = await req.json();

  // Proteksi: admin tidak boleh menonaktifkan atau menurunkan role dirinya
  // sendiri — supaya tidak ada kejadian "terkunci" tanpa admin aktif tersisa.
  const isSelf = id === session.user.id;
  if (isSelf && aktif === false) {
    return jsonError('Anda tidak bisa menonaktifkan akun Anda sendiri.');
  }
  if (isSelf && role !== undefined && role !== 'admin') {
    return jsonError('Anda tidak bisa menurunkan role akun Anda sendiri.');
  }

  const fields = [];
  const values = [];
  const logNotes = [];

  if (namaLengkap !== undefined) {
    const namaTrim = namaLengkap.trim();
    if (!namaTrim) return jsonError('Nama lengkap tidak boleh kosong.');
    values.push(namaTrim);
    fields.push(`nama_lengkap = $${values.length}`);
  }
  if (role !== undefined) {
    if (!ROLES.includes(role)) return jsonError('Role tidak valid.');
    values.push(role);
    fields.push(`role = $${values.length}`);
  }
  if (aktif !== undefined) {
    values.push(aktif);
    fields.push(`aktif = $${values.length}`);
  }
  if (password) {
    if (password.length < 6) return jsonError('Password minimal 6 karakter.');
    const hash = await bcrypt.hash(password, 10);
    values.push(hash);
    fields.push(`password_hash = $${values.length}`);
  }

  if (fields.length === 0) return jsonError('Tidak ada perubahan dikirim.');

  values.push(id);
  const res = await query(
    `update users set ${fields.join(', ')} where id = $${values.length}
     returning id, username, nama_lengkap, role, aktif, created_at`,
    values
  );
  if (!res.rows[0]) return jsonError('User tidak ditemukan.', 404);''
  await logActivity(session, 'edit_user', `${res.rows[0].username}: ${logNotes.join(', ')}`);
  return jsonOk({ user: res.rows[0] });
});

// DELETE: soft-delete (set aktif=false) — sama seperti pola di admin/ruangan.
// Akun TIDAK dihapus dari database supaya riwayat Berita Acara yang pernah
// dibuat oleh user ini (kolom dibuat_oleh) tetap utuh.
export const DELETE = withAdminAuth(async (req, { params }, session) => {
  const { id } = await params;
  if (id === session.user.id) {
    return jsonError('Anda tidak bisa menonaktifkan akun Anda sendiri.');
  }
  const res = await query(`update users set aktif = false where id = $1 returning id, username`, [id]);
  if (!res.rows[0]) return jsonError('User tidak ditemukan.', 404);
  await logActivity(session, 'nonaktif_user', res.rows[0].username);
  return jsonOk({ deleted: true });
});