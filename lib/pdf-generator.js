import { Document, Page, Text, View, Image, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer';
import { tanggalIndo } from './nomor';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: 'Helvetica', color: '#16233a' },
  title: { fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 4 },
  nomor: { fontSize: 10, textAlign: 'center', marginBottom: 12 },
  para: { marginBottom: 6, lineHeight: 1.4 },
  field: { marginBottom: 2 },
  table: { display: 'table', width: '100%', borderWidth: 1, borderColor: '#999', marginVertical: 8 },
  row: { flexDirection: 'row' },
  headerCell: { backgroundColor: '#eee', fontWeight: 700, padding: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#ccc' },
  cell: { padding: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#ccc' },
  colNo: { width: '6%' }, colNama: { width: '30%' }, colSatuan: { width: '10%' },
  colD: { width: '18%' }, colE: { width: '16%' }, colKet: { width: '20%' },
  signWrap: { flexDirection: 'row', marginTop: 24 },
  signCell: { flex: 1, alignItems: 'center' },
  signImg: { width: 90, height: 45, marginVertical: 4 },
});

function showNum(v) {
  if (v === '' || v === null || v === undefined) return '0';
  return String(v);
}
function showKolomE(jenis, kolomE, kolomD) {
  const isBlank = kolomE === '' || kolomE === null || kolomE === undefined;
  if (jenis === 'Penutupan' && isBlank) return showNum(kolomD);
  return showNum(kolomE);
}

const ROLE_LABEL = { petugas1: 'Petugas 1', petugas2: 'Petugas 2', kepala: 'Mengetahui,\nKepala Ruangan' };

function BADocument({ data, sigDataUrls }) {
  const labelD = data.jenis === 'Penutupan' ? 'Sisa Stok (Pembukaan Terakhir)' : 'Jml. Standar';
  const labelE = data.jenis === 'Pembukaan' ? 'Jml. Terpakai' : 'Jml. Aktual';
  const intro = data.jenis === 'Pembukaan'
    ? `Pada hari ini, ${tanggalIndo(data.tanggalKejadian)}, pukul ${data.pukul || '-'} WIB, telah dilakukan pembukaan troli emergency dengan rincian sebagai berikut:`
    : `Pada hari ini, ${tanggalIndo(data.tanggalKejadian)}, pukul ${data.pukul || '-'} WIB, telah dilakukan penutupan troli emergency (dibandingkan dengan sisa stok dari laporan pembukaan terakhir) dengan rincian sebagai berikut:`;
  const closing = data.jenis === 'Pembukaan'
    ? 'Demikian berita acara pembukaan troli emergency ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.'
    : 'Demikian berita acara penutupan troli emergency ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.';
  const kondisiLabel = data.jenis === 'Pembukaan' ? 'awal' : 'akhir';
  const nameByKey = { petugas1: data.petugas1, petugas2: data.petugas2, kepala: data.kepala };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>BERITA ACARA {data.jenis.toUpperCase()} TROLI EMERGENCY</Text>
        <Text style={styles.nomor}>Nomor : {data.nomor}</Text>

        <Text style={styles.para}>{intro}</Text>
        <Text style={styles.field}>Ruangan / Unit  : {data.ruangan}</Text>
        {(data.namaPasien || data.noRM) && (
          <>
            <Text style={styles.field}>Nama Pasien  : {data.namaPasien || '-'}</Text>
            <Text style={styles.field}>No. Rekam Medis  : {data.noRM || '-'}</Text>
          </>
        )}
        {data.jenis === 'Pembukaan' ? (
          <>
            <Text style={styles.field}>Nomor Segel Awal  : {data.nomorSegel || '-'}</Text>
            <Text style={styles.field}>Kondisi Segel Saat Ditemukan  : {data.kondisiSegel || '-'}</Text>
            <Text style={styles.field}>Alasan Pembukaan  : {data.alasan || '-'}</Text>
          </>
        ) : (
          <>
            <Text style={styles.field}>Nomor Segel Baru  : {data.nomorSegel || '-'}</Text>
            <Text style={styles.field}>Alasan Penutupan  : {data.alasan || '-'}</Text>
          </>
        )}

        <Text style={{ ...styles.para, marginTop: 8 }}>
          Setelah dilakukan pengecekan, kondisi {kondisiLabel} obat dan alat kesehatan dalam troli emergency adalah sebagai berikut:
        </Text>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.headerCell, styles.colNo]}>No</Text>
            <Text style={[styles.headerCell, styles.colNama]}>Nama Obat / Alat</Text>
            <Text style={[styles.headerCell, styles.colSatuan]}>Satuan</Text>
            <Text style={[styles.headerCell, styles.colD]}>{labelD}</Text>
            <Text style={[styles.headerCell, styles.colE]}>{labelE}</Text>
            <Text style={[styles.headerCell, styles.colKet]}>Keterangan</Text>
          </View>
          {data.items.map((it, i) => (
            <View style={styles.row} key={i} wrap={false}>
              <Text style={[styles.cell, styles.colNo]}>{it.no}</Text>
              <Text style={[styles.cell, styles.colNama]}>{it.nama}</Text>
              <Text style={[styles.cell, styles.colSatuan]}>{it.satuan || ''}</Text>
              <Text style={[styles.cell, styles.colD]}>{showNum(it.kolomD)}</Text>
              <Text style={[styles.cell, styles.colE]}>{showKolomE(data.jenis, it.kolomE, it.kolomD)}</Text>
              <Text style={[styles.cell, styles.colKet]}>{it.keterangan || ''}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.para}>Catatan / Tindak Lanjut  : {data.catatan || '-'}</Text>
        <Text style={styles.para}>{closing}</Text>

        <View style={styles.signWrap}>
          {data.rolesNeeded.map((k) => (
            <View style={styles.signCell} key={k}>
              <Text>{ROLE_LABEL[k]}</Text>
              {sigDataUrls[k] ? <Image src={sigDataUrls[k]} style={styles.signImg} /> : <View style={{ height: 45 }} />}
              <Text>({nameByKey[k] || '.........................'})</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

/**
 * data: sama seperti generateDocxBuffer.
 * sigDataUrls: { petugas1, petugas2, kepala } berisi data URL base64 gambar TTD
 * (react-pdf bisa langsung pakai data URL, tidak perlu fetch dulu).
 */
export async function generatePdfBuffer(data, sigDataUrls = {}) {
  return renderToBuffer(<BADocument data={data} sigDataUrls={sigDataUrls} />);
}
