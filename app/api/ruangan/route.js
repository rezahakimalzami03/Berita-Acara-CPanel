import { query } from '@/lib/db';
import { withAuth, jsonOk, allowedRuanganIds } from '@/lib/api-helpers';

export const GET = withAuth(async (req, ctx, session) => {
  const allowed = await allowedRuanganIds(session);
  const res = await query(
    'select id, nama from ruangan where aktif = true and ($1::uuid[] is null or id = any($1)) order by nama',
    [allowed]
  );
  return jsonOk({ ruangan: res.rows });
});
