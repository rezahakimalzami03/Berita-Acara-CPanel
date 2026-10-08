// ============================================================
// MIGRASI DATA DARI GOOGLE SHEETS (CSV) KE POSTGRES
// ============================================================
// Jalankan dari terminal (folder webv2/app):
//
//   export DATABASE_URL="postgres://...."   (dari Supabase, connection pooling)
//   node scripts/migrate-from-csv.js \
//     --master scripts/master-item-saya.csv \
//     --riwayat scripts/riwayat-laporan-export.csv \
//     --log scripts/log-pemakaian-export.csv
//
// CARA SIAPKAN FILE CSV-NYA:
//
// 1) master-item.csv — isi manual (bukan auto-export, karena struktur sheet
//    "Master <Ruangan>" tercampur beberapa bagian sekaligus jadi riskan
//    auto-parse salah). Formatnya (lihat scripts/template-master-item.csv):
//      ruangan,nama,satuan,jumlah_standar
//      IGD,EPINEFRIN INJEKSI,AMPUL,5
//    Tinggal copy-paste 4 kolom (No diabaikan, Nama, Satuan, Standar) dari
//    tiap sheet "Master <Ruangan>" (baris 5 ke bawah) ke file ini, ulangi utk
//    setiap ruangan. Cukup dilakukan SEKALI di awal migrasi.
//
// 2) riwayat-laporan.csv — dari Google Sheets: buka sheet "Riwayat Laporan"
//    > File > Download > Comma Separated Values (.csv).
//
// 3) log-pemakaian.csv — dari Google Sheets: buka sheet "Log Pemakaian" >
//    File > Download > Comma Separated Values (.csv).
//
// KETERBATASAN (harap dibaca):
// - Tanda tangan (TTD) dokumen LAMA tidak ikut termigrasi (kolom TTD di
//   Riwayat Laporan berisi rumus =IMAGE(...), tidak ikut ter-export bersih
//   ke CSV). Dokumen lama tetap bisa dibuka lewat "Link Google Doc/PDF" asli.
// - Detail per-item untuk dokumen PENUTUPAN lama tidak ikut termigrasi
//   (sistem lama tidak menyimpan itu di sheet manapun, cuma di dalam
//   dokumen Word/PDF-nya). Detail per-item untuk dokumen PEMBUKAAN lama
//   IKUT termigrasi (direkonstruksi dari sheet "Log Pemakaian").
// - docx_url / pdf_url dokumen lama akan menunjuk ke Google Docs/Drive yang
//   ASLI (bukan file baru) — supaya dokumen historis tetap bisa dibuka persis
//   seperti sebelumnya.

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Pool } = require('pg');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    out[args[i].replace(/^--/, '')] = args[i + 1];
  }
  return out;
}

/** Sheets biasanya export tanggal sebagai "dd/MM/yyyy" atau "dd/MM/yyyy HH:mm". */
function parseTanggalSheet(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = '0', min = '0'] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
}
function toDateOnly(d) {
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  const { master, riwayat, log } = parseArgs();
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL belum diset.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    const ruanganIdByName = new Map();

    // ---------- 1) MASTER ITEM ----------
    if (master) {
      const rows = parse(fs.readFileSync(path.resolve(master)), { columns: true, skip_empty_lines: true });
      let ruanganCount = 0, itemCount = 0;
      for (const r of rows) {
        const namaRuangan = (r.ruangan || '').trim();
        if (!namaRuangan) continue;
        if (!ruanganIdByName.has(namaRuangan)) {
          const res = await pool.query(
            `insert into ruangan (nama) values ($1)
             on conflict (nama) do update set nama = excluded.nama
             returning id`,
            [namaRuangan]
          );
          ruanganIdByName.set(namaRuangan, res.rows[0].id);
          ruanganCount++;
        }
        const ruanganId = ruanganIdByName.get(namaRuangan);
        await pool.query(
          `insert into master_item (ruangan_id, nama, satuan, jumlah_standar)
           values ($1, $2, $3, $4)
           on conflict (ruangan_id, nama) do update set satuan = excluded.satuan, jumlah_standar = excluded.jumlah_standar`,
          [ruanganId, (r.nama || '').trim(), (r.satuan || '').trim(), Number(r.jumlah_standar) || 0]
        );
        itemCount++;
      }
      console.log(`✅ Master item: ${ruanganCount} ruangan, ${itemCount} item.`);
    }

    // ---------- 2) RIWAYAT LAPORAN -> berita_acara ----------
    const nomorToBaId = new Map();
    if (riwayat) {
      const rows = parse(fs.readFileSync(path.resolve(riwayat)), { columns: true, skip_empty_lines: true });
      let ok = 0, skip = 0;
      for (const r of rows) {
        const namaRuangan = (r['Ruangan/Unit'] || '').trim();
        const nomor = (r['Nomor BA'] || '').trim();
        if (!namaRuangan || !nomor) { skip++; continue; }

        if (!ruanganIdByName.has(namaRuangan)) {
          const res = await pool.query(
            `insert into ruangan (nama) values ($1)
             on conflict (nama) do update set nama = excluded.nama
             returning id`,
            [namaRuangan]
          );
          ruanganIdByName.set(namaRuangan, res.rows[0].id);
        }
        const ruanganId = ruanganIdByName.get(namaRuangan);

        const tglKejadian = toDateOnly(parseTanggalSheet(r['Tanggal Kejadian']));
        const createdAt = parseTanggalSheet(r['Timestamp Dibuat']) || new Date();
        const jumlahPemakaian = r['Jumlah Pemakaian Obat (Hari Itu)'] === '' ? null : Number(r['Jumlah Pemakaian Obat (Hari Itu)']);

        const res = await pool.query(
          `insert into berita_acara
             (nomor, jenis, ruangan_id, tanggal_kejadian, jumlah_pemakaian, docx_url, pdf_url, created_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8)
           on conflict (nomor) do nothing
           returning id`,
          [nomor, r['Jenis'], ruanganId, tglKejadian, jumlahPemakaian, r['Link Google Doc'] || null, r['Link PDF'] || null, createdAt]
        );
        if (res.rows[0]) { nomorToBaId.set(nomor, res.rows[0].id); ok++; } else { skip++; }
      }
      console.log(`✅ Riwayat Laporan: ${ok} baru dimigrasi, ${skip} dilewati (data kosong/duplikat).`);
    }

    // ---------- 3) LOG PEMAKAIAN -> log_pemakaian + berita_acara_item (utk Pembukaan) ----------
    if (log) {
      const rows = parse(fs.readFileSync(path.resolve(log)), { columns: true, skip_empty_lines: true });
      let ok = 0, skip = 0;
      const itemUrutan = new Map(); // berita_acara_id -> urutan berjalan
      for (const r of rows) {
        const nomor = (r['Nomor BA'] || '').trim();
        const namaRuangan = (r['Ruangan/Unit'] || '').trim();
        const baId = nomorToBaId.get(nomor);
        const ruanganId = ruanganIdByName.get(namaRuangan);
        if (!baId || !ruanganId) { skip++; continue; }

        const tglKejadian = toDateOnly(parseTanggalSheet(r['Tanggal Kejadian']));
        if (!tglKejadian) { skip++; continue; }

        const standar = Number(r['Jumlah Standar Saat Itu']) || 0;
        const terpakai = Number(r['Jumlah Terpakai']) || 0;
        const sisa = Number(r['Sisa Stok']) || (standar - terpakai);

        await pool.query(
          `insert into log_pemakaian
             (berita_acara_id, ruangan_id, tanggal_kejadian, nama, satuan, jumlah_standar, jumlah_terpakai, sisa_stok, nama_pasien, no_rm)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [baId, ruanganId, tglKejadian, r['Nama Obat/Alat'], r['Satuan'] || '', standar, terpakai, sisa,
           r['Nama Pasien'] || null, r['No. Rekam Medis'] || null]
        );

        const urutan = (itemUrutan.get(baId) || 0) + 1;
        itemUrutan.set(baId, urutan);
        await pool.query(
          `insert into berita_acara_item (berita_acara_id, urutan, nama, satuan, kolom_d, kolom_e)
           values ($1,$2,$3,$4,$5,$6)`,
          [baId, urutan, r['Nama Obat/Alat'], r['Satuan'] || '', standar, terpakai]
        );
        ok++;
      }
      console.log(`✅ Log Pemakaian: ${ok} baris dimigrasi, ${skip} dilewati (Nomor BA/ruangan/tanggal tidak cocok).`);
    }

    console.log('\n🎉 Migrasi selesai.');
  } catch (err) {
    console.error('❌ Gagal migrasi:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
