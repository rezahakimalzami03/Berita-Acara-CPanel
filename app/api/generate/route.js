import { getPool } from '@/lib/db';
import { withAuth, jsonOk, jsonError, canAccessRuangan, FORBIDDEN_RUANGAN } from '@/lib/api-helpers';
import { computeNomorBA } from '@/lib/nomor';
import { uploadSignature, uploadFile } from '@/lib/storage';
import { generateDocxBuffer } from '@/lib/docx-generator';
import { generatePdfBuffer } from '@/lib/pdf-generator';
import { logActivity } from '@/lib/audit';

const ROLES_ALL = ['petugas1', 'petugas2', 'kepala'];

export const POST = withAuth(async (req, ctx, session) => {
  const body = await req.json();
  const {
    jenis, ruanganId, ruanganNama, tanggal, pukul, namaPasien, noRM,
    nomorSegel, kondisiSegel, alasan, catatan, items = [],
    petugas1, petugas2, kepala, ttd = {}, confirmDuplicate,
  } = body;

  if (!jenis || !ruanganId || !tanggal) return jsonError('Jenis, Ruangan, dan Tanggal wajib diisi.');
  if (!(await canAccessRuangan(session, ruanganId))) return jsonError(FORBIDDEN_RUANGAN, 403);
  if (jenis !== 'Pembukaan' && jenis !== 'Penutupan') return jsonError('Jenis tidak valid.');
  if (!Array.isArray(items) || items.length === 0) return jsonError('Daftar obat/alat kosong.');

  const rolesNeeded = jenis === 'Penutupan' ? ROLES_ALL : ['petugas1', 'petugas2'];
  const namesByKey = { petugas1, petugas2, kepala };
  const missing = rolesNeeded.filter((k) => !namesByKey[k] || !ttd[k]);
  if (missing.length > 0) {
    return jsonError('Nama & tanda tangan belum lengkap untuk: ' + missing.join(', '));
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    // ---- Cek duplikat: Jenis + Ruangan + Tanggal Kejadian sama ----
    const dupRes = await client.query(
      `select nomor, created_at from berita_acara
       where jenis = $1 and ruangan_id = $2 and tanggal_kejadian = $3
       order by created_at desc limit 1`,
      [jenis, ruanganId, tanggal]
    );
    if (dupRes.rows[0] && !confirmDuplicate) {
      return jsonOk({
        ok: false,
        duplicate: true,
        dupInfo: { nomor: dupRes.rows[0].nomor, timestamp: dupRes.rows[0].created_at },
      });
    }

    const nomor = await computeNomorBA(tanggal, jenis);

    // ---- Upload tanda tangan ----
    const ttdUrls = {};
    for (const k of rolesNeeded) {
      if (ttd[k]) ttdUrls[k] = await uploadSignature(k, ttd[k]);
    }

    // ---- Generate dokumen ----
    const docData = {
      jenis, nomor, tanggalKejadian: tanggal, pukul, ruangan: ruanganNama,
      namaPasien, noRM, nomorSegel, kondisiSegel, alasan, catatan,
      items: items.map((it, i) => ({ ...it, no: i + 1 })),
      petugas1, petugas2, kepala, ttdUrls, rolesNeeded,
    };
    const docxBuffer = await generateDocxBuffer(docData);
    const pdfBuffer = await generatePdfBuffer(docData, ttd);

    const safeNomor = nomor.replace(/\//g, '-');
    const baseName = `Berita Acara ${jenis} Troli Emergency - ${ruanganNama} - ${safeNomor}`;
    const docxUrl = await uploadFile(`dokumen/${baseName}.docx`, docxBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const pdfUrl = await uploadFile(`dokumen/${baseName}.pdf`, pdfBuffer, 'application/pdf');

    // ---- Simpan ke database (transaksi) ----
    await client.query('BEGIN');

    let jumlahPemakaian = null;
    if (jenis === 'Pembukaan') {
      jumlahPemakaian = items.reduce((s, it) => s + (Number(it.kolomE) || 0), 0);
    }

    const baRes = await client.query(
      `insert into berita_acara
        (nomor, jenis, ruangan_id, tanggal_kejadian, pukul, nama_pasien, no_rm, nomor_segel,
         kondisi_segel, alasan, catatan, jumlah_pemakaian, petugas1_nama, petugas2_nama, kepala_nama,
         petugas1_ttd_url, petugas2_ttd_url, kepala_ttd_url, docx_url, pdf_url, dibuat_oleh)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       returning id`,
      [nomor, jenis, ruanganId, tanggal, pukul || null, namaPasien || null, noRM || null,
       nomorSegel || null, kondisiSegel || null, alasan || null, catatan || null, jumlahPemakaian,
       petugas1 || null, petugas2 || null, kepala || null,
       ttdUrls.petugas1 || null, ttdUrls.petugas2 || null, ttdUrls.kepala || null,
       docxUrl, pdfUrl, session.user.id]
    );
    const beritaAcaraId = baRes.rows[0].id;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await client.query(
        `insert into berita_acara_item (berita_acara_id, urutan, nama, satuan, kolom_d, kolom_e, keterangan)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [beritaAcaraId, i + 1, it.nama, it.satuan || '', Number(it.kolomD) || 0,
         it.kolomE === '' || it.kolomE === undefined ? null : Number(it.kolomE), it.keterangan || null]
      );

      if (jenis === 'Pembukaan') {
        const standar = Number(it.kolomD) || 0;
        const terpakai = Number(it.kolomE) || 0;
        const sisa = standar - terpakai;
        await client.query(
          `insert into log_pemakaian
            (berita_acara_id, ruangan_id, tanggal_kejadian, nama, satuan, jumlah_standar, jumlah_terpakai, sisa_stok, nama_pasien, no_rm)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [beritaAcaraId, ruanganId, tanggal, it.nama, it.satuan || '', standar, terpakai, sisa, namaPasien || null, noRM || null]
        );
      }
    }

    await client.query('COMMIT');
    await logActivity(session, 'buat_ba', `${jenis} — Nomor ${nomor} (${ruanganNama})`);
    return jsonOk({ nomor, docxUrl, pdfUrl, docName: baseName });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return jsonError(err.message || 'Gagal membuat dokumen.', 500);
  } finally {
    client.release();
  }
});
