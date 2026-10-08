import { query } from '@/lib/db';
import { withAuth, jsonOk } from '@/lib/api-helpers';

export const GET = withAuth(async () => {
  const res = await query('select id, nama from ruangan where aktif = true order by nama');
  return jsonOk({ ruangan: res.rows });
});
