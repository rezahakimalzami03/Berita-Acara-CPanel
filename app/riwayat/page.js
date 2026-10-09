'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api-client';
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
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, nomor }
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

  const doDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    setError('');
    try {
      await api.riwayatDelete(confirmTarget.id);
      setConfirmTarget(null);
      await load();
    } catch (e) {
      setError(e.message);
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
                        onClick={() => setConfirmTarget({ id: r.id, nomor: r.nomor })}
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

        {confirmTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !deleting && setConfirmTarget(null)}>
            <Card className="p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-[var(--color-alert-50)] flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-[var(--color-alert-600)]" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-[var(--color-navy-900)]">Hapus Berita Acara?</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Nomor <span className="font-mono">{confirmTarget.nomor}</span> akan dihapus permanen — beserta
                    data pemakaian & rekapnya di Dashboard. File Word/PDF yang sudah pernah didownload
                    tidak ikut terhapus dari perangkat Anda, tapi link-nya tidak akan berfungsi lagi.
                    Tindakan ini <span className="font-semibold">tidak bisa dibatalkan</span>.
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <Button variant="ghost" onClick={() => setConfirmTarget(null)} disabled={deleting}>Batal</Button>
                <Button variant="danger" onClick={doDelete} disabled={deleting}>
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Ya, Hapus
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}