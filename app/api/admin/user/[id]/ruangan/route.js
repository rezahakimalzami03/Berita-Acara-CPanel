import { query, getPool } from '@/lib/db';
import { withAdminAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { logActivity } from '@/lib/audit';

// GET: id ruangan yang boleh diubah master-nya oleh user ini (khusus petugas).
export const GET = withAdminAuth(async (req, { params }) => {
  const { id } = await params;
  const res = await query('select ruangan_id from user_ruangan where user_id = $1', [id]);
  return jsonOk({ ruanganIds: res.rows.map((r) => r.ruangan_id) });
});

// PUT { ruanganIds: [...] }: ganti seluruh daftar akses user ini.
export const PUT = withAdminAuth(async (req, { params }, session) => {
  const { id } = await params;
  const { ruanganIds } = await req.json();
  if (!Array.isArray(ruanganIds)) return jsonError('ruanganIds harus berupa array.');

  const u = await query('select username from users where id = $1', [id]);
  if (!u.rows[0]) return jsonError('User tidak ditemukan.', 404);

  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query('delete from user_ruangan where user_id = $1', [id]);
    if (ruanganIds.length > 0) {
      await client.query(
        `insert into user_ruangan (user_id, ruangan_id)
         select $1::uuid, r.id from ruangan r where r.id = any($2::uuid[])`,
        [id, ruanganIds]
      );
    }
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
  await logActivity(session, 'akses_master', `${u.rows[0].username}: ${ruanganIds.length} ruangan`);
  return jsonOk({ saved: true });
});
