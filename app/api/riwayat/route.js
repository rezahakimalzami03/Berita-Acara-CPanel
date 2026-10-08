import { query } from '@/lib/db';
import { withAuth, jsonOk } from '@/lib/api-helpers';

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const ruanganId = searchParams.get('ruanganId') || '';
  const jenis = searchParams.get('jenis') || '';
  const limit = Number(searchParams.get('limit')) || 20;
  const offset = Number(searchParams.get('offset')) || 0;

  const conditions = [];
  const params = [];
  if (ruanganId) { params.push(ruanganId); conditions.push(`ba.ruangan_id = $${params.length}`); }
  if (jenis) { params.push(jenis); conditions.push(`ba.jenis = $${params.length}`); }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';

  const totalRes = await query(`select count(*)::int as total from berita_acara ba ${where}`, params);
  const total = totalRes.rows[0].total;

  params.push(limit, offset);
  const rowsRes = await query(
    `select ba.nomor, ba.jenis, r.nama as ruangan, ba.tanggal_kejadian, ba.jumlah_pemakaian,
            ba.docx_url, ba.pdf_url, ba.created_at
     from berita_acara ba join ruangan r on r.id = ba.ruangan_id
     ${where}
     order by ba.created_at desc
     limit $${params.length - 1} offset $${params.length}`,
    params
  );

  const rows = rowsRes.rows.map((r) => ({
    nomor: r.nomor,
    jenis: r.jenis,
    ruangan: r.ruangan,
    tanggalKejadian: r.tanggal_kejadian.toISOString().slice(0, 10).split('-').reverse().join('/'),
    jumlahPemakaian: r.jumlah_pemakaian,
    docUrl: r.docx_url,
    pdfUrl: r.pdf_url,
    timestamp: new Date(r.created_at).toLocaleString('id-ID'),
  }));

  return jsonOk({ rows, total });
});
