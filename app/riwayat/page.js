'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api-client';
import { confirmAction, alertError, alertSuccess } from '@/lib/alert';
import { Card, Select, Button, Pill } from '@/components/ui';
import { Loader2, FileText, FileDown, ChevronLeft, ChevronRight, AlertTriangle, Trash2, X } from 'lucide-react';

const LIMIT = 20;

export default function RiwayatPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [ruanganList, setRuanganList] = useState([]);
  const [ruanganId, setRuanganId] = useState('');
  const [jenis, setJenis] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.ruanganList().then((d) => setRuanganList(d.ruangan || [])).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.riwayat({ ruanganId, jenis, limit: LIMIT, offset: page * LIMIT });
      setRows(d.rows);
      setTotal(d.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [ruanganId, jenis, page]); // eslint-disable-line

  const askDelete = async (r) => {
    const ok = await confirmAction({
      title: 'Hapus Berita Acara?',
      html: `Nomor <b>${r.nomor}</b> akan dihapus permanen beserta data pemakaian & rekapnya di Dashboard.<br/>Tindakan ini <b>tidak bisa dibatalkan</b>.`,
      confirmText: 'Ya, hapus',
      icon: 'warning',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    setError('');
    try {
      await api.riwayatDelete(r.id);
      await load();
      alertSuccess('Berita Acara dihapus.');
    } catch (e) {
      alertError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const maxPage = Math.max(0, Math.ceil(total / LIMIT) - 1);

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-navy-900)]">Riwayat Laporan</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} dokumen tercatat</p>
        </div>

        <Card className="p-4 md:p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select className="sm:max-w-[200px]" value={ruanganId} onChange={(e) => { setRuanganId(e.target.value); setPage(0); }}>
              <option value="">Semua Ruangan</option>
              {ruanganList.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </Select>
            <Select className="sm:max-w-[180px]" value={jenis} onChange={(e) => { setJenis(e.target.value); setPage(0); }}>
              <option value="">Semua Jenis</option>
              <option value="Pembukaan">Pembukaan</option>
              <option value="Penutupan">Penutupan</option>
            </Select>
          </div>
        </Card>

        {error && (
          <div className="rounded-xl bg-[var(--color-alert-50)] border border-[var(--color-alert-100)] text-[var(--color-alert-700)] text-sm px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-16 justify-center">
              <Loader2 size={18} className="animate-spin" /> Memuat...
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-16">Tidak ada dokumen ditemukan.</p>
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {rows.map((r, i) => (
                <div key={i} className="p-4 md:p-5 flex flex-wrap items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Pill tone={r.jenis === 'Pembukaan' ? 'vital' : 'seal'}>{r.jenis}</Pill>
                      <span className="font-mono text-xs text-slate-400">{r.nomor}</span>
                    </div>
                    <p className="font-semibold text-[var(--color-navy-900)] text-sm break-words">{r.ruangan} · {r.tanggalKejadian}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Dibuat {r.timestamp}
                      {r.jenis === 'Pembukaan' && r.jumlahPemakaian !== null && ` · ${r.jumlahPemakaian} item terpakai`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0 w-full sm:w-auto">
                    {r.docUrl && (
                      <a href={r.docUrl} target="_blank" rel="noreferrer">
                        <Button variant="ghost" className="!px-3 !py-2 text-xs"><FileText size={14} /> Word</Button>
                      </a>
                    )}
                    {r.pdfUrl && (
                      <a href={r.pdfUrl} target="_blank" rel="noreferrer">
                        <Button variant="ghost" className="!px-3 !py-2 text-xs"><FileDown size={14} /> PDF</Button>
                      </a>
                    )}
                    {isAdmin && (
                      <Button
                        variant="danger"
                        className="!px-3 !py-2 text-xs"
                        onClick={() => askDelete(r)}
                        disabled={deleting}
                        title="Hapus Berita Acara ini (salah input)"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {total > LIMIT && (
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <Button variant="ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft size={15} /> Sebelumnya
            </Button>
            <span className="text-sm text-slate-500">Halaman {page + 1} dari {maxPage + 1}</span>
            <Button variant="ghost" onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}>
              Berikutnya <ChevronRight size={15} />
            </Button>
          </div>
        )}

      </div>
    </Layout>
  );
}