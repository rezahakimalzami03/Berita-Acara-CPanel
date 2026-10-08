import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ImageRun,
} from 'docx';
import { tanggalIndo } from './nomor';
import { readFileByUrl } from './storage';

const ROLE_LABEL = { petugas1: 'Petugas 1', petugas2: 'Petugas 2', kepala: 'Mengetahui,\nKepala Ruangan' };

function showNum(v) {
  if (v === '' || v === null || v === undefined) return '0';
  return String(v);
}

/** Kolom "Jml. Aktual" saat Penutupan: kosong -> ambil dari Sisa Stok (kolomD), bukan 0. */
function showKolomE(jenis, kolomE, kolomD) {
  const isBlank = kolomE === '' || kolomE === null || kolomE === undefined;
  if (jenis === 'Penutupan' && isBlank) return showNum(kolomD);
  return showNum(kolomE);
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  // URL lokal ("/files/...") dibaca langsung dari disk server.
  if (url.startsWith('/files/')) return readFileByUrl(url);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

/**
 * data = {
 *   jenis, nomor, tanggalKejadian, pukul, ruangan, namaPasien, noRM,
 *   nomorSegel, kondisiSegel, alasan, catatan, items:[{no,nama,satuan,kolomD,kolomE,keterangan}],
 *   petugas1, petugas2, kepala, ttdUrls:{petugas1,petugas2,kepala}, rolesNeeded:['petugas1','petugas2','kepala'?]
 * }
 * Return: Buffer (.docx)
 */
export async function generateDocxBuffer(data) {
  const labelD = data.jenis === 'Penutupan' ? 'Sisa Stok (Pembukaan Terakhir)' : 'Jml. Standar';
  const labelE = data.jenis === 'Pembukaan' ? 'Jml. Terpakai' : 'Jml. Aktual';

  const cellText = (text, opts = {}) => new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: !!opts.bold, size: 18 })] })],
  });

  const headerRow = new TableRow({
    tableHeader: true,
    children: ['No', 'Nama Obat / Alat', 'Satuan', labelD, labelE, 'Keterangan'].map((h, i) =>
      cellText(h, { bold: true, width: [6, 30, 10, 18, 16, 20][i] })
    ),
  });

  const itemRows = data.items.map((it) => new TableRow({
    children: [
      cellText(it.no),
      cellText(it.nama, { width: 30 }),
      cellText(it.satuan || ''),
      cellText(showNum(it.kolomD)),
      cellText(showKolomE(data.jenis, it.kolomE, it.kolomD)),
      cellText(it.keterangan || ''),
    ],
  }));

  const itemTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...itemRows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
      left: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
      right: { style: BorderStyle.SINGLE, size: 2, color: '999999' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
    },
  });

  const intro = data.jenis === 'Pembukaan'
    ? `Pada hari ini, ${tanggalIndo(data.tanggalKejadian)}, pukul ${data.pukul || '-'} WIB, telah dilakukan pembukaan troli emergency dengan rincian sebagai berikut:`
    : `Pada hari ini, ${tanggalIndo(data.tanggalKejadian)}, pukul ${data.pukul || '-'} WIB, telah dilakukan penutupan troli emergency (dibandingkan dengan sisa stok dari laporan pembukaan terakhir) dengan rincian sebagai berikut:`;

  const fieldParas = [
    new Paragraph({ text: `Ruangan / Unit\t: ${data.ruangan}` }),
  ];
  if (data.namaPasien || data.noRM) {
    fieldParas.push(new Paragraph({ text: `Nama Pasien\t: ${data.namaPasien || '-'}` }));
    fieldParas.push(new Paragraph({ text: `No. Rekam Medis\t: ${data.noRM || '-'}` }));
  }
  if (data.jenis === 'Pembukaan') {
    fieldParas.push(new Paragraph({ text: `Nomor Segel Awal\t: ${data.nomorSegel || '-'}` }));
    fieldParas.push(new Paragraph({ text: `Kondisi Segel Saat Ditemukan\t: ${data.kondisiSegel || '-'}` }));
    fieldParas.push(new Paragraph({ text: `Alasan Pembukaan\t: ${data.alasan || '-'}` }));
  } else {
    fieldParas.push(new Paragraph({ text: `Nomor Segel Baru\t: ${data.nomorSegel || '-'}` }));
    fieldParas.push(new Paragraph({ text: `Alasan Penutupan\t: ${data.alasan || '-'}` }));
  }

  const kondisiLabel = data.jenis === 'Pembukaan' ? 'awal' : 'akhir';

  const closing = data.jenis === 'Pembukaan'
    ? 'Demikian berita acara pembukaan troli emergency ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.'
    : 'Demikian berita acara penutupan troli emergency ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.';

  // Tabel tanda tangan
  const roles = data.rolesNeeded;
  const nameByKey = { petugas1: data.petugas1, petugas2: data.petugas2, kepala: data.kepala };
  const sigImages = {};
  for (const key of roles) {
    sigImages[key] = await fetchImageBuffer(data.ttdUrls?.[key]);
  }

  const signCellWidth = 100 / roles.length;
  const labelRow = new TableRow({
    children: roles.map((k) => new TableCell({
      width: { size: signCellWidth, type: WidthType.PERCENTAGE },
      borders: noBorder(),
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: ROLE_LABEL[k], size: 20 })] })],
    })),
  });
  const imageRow = new TableRow({
    children: roles.map((k) => new TableCell({
      borders: noBorder(),
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: sigImages[k] ? [new ImageRun({ data: sigImages[k], transformation: { width: 100, height: 50 } })] : [new TextRun('')],
      })],
    })),
  });
  const nameRow = new TableRow({
    children: roles.map((k) => new TableCell({
      borders: noBorder(),
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `(${nameByKey[k] || '.........................'})`, size: 20 })] })],
    })),
  });
  const signTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [labelRow, new TableRow({ children: roles.map(() => new TableCell({ borders: noBorder(), children: [new Paragraph('')] })) }), imageRow, nameRow],
  });

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 800, bottom: 800, left: 800, right: 800 } } }, // A4, margin ~1.4cm
      children: [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `BERITA ACARA ${data.jenis.toUpperCase()} TROLI EMERGENCY`, bold: true })],
        }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(`Nomor : ${data.nomor}`)] }),
        new Paragraph(''),
        new Paragraph(intro),
        ...fieldParas,
        new Paragraph(''),
        new Paragraph(`Setelah dilakukan pengecekan, kondisi ${kondisiLabel} obat dan alat kesehatan dalam troli emergency adalah sebagai berikut:`),
        new Paragraph(''),
        itemTable,
        new Paragraph(''),
        new Paragraph(`Catatan / Tindak Lanjut\t: ${data.catatan || '-'}`),
        new Paragraph(''),
        new Paragraph(closing),
        new Paragraph(''),
        new Paragraph(''),
        signTable,
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

function noBorder() {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: none, bottom: none, left: none, right: none };
}
