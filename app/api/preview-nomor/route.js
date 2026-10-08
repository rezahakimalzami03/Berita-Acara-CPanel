import { withAuth, jsonOk, jsonError } from '@/lib/api-helpers';
import { computeNomorBA } from '@/lib/nomor';

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const tanggal = searchParams.get('tanggal');
  const jenis = searchParams.get('jenis');
  if (!tanggal || !jenis) return jsonError('tanggal & jenis wajib diisi');
  const nomor = await computeNomorBA(tanggal, jenis);
  return jsonOk({ nomor });
});
