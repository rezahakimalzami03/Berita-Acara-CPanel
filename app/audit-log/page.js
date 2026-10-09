'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api-client';
import { Card, Select, Button, Pill } from '@/components/ui';
import { Loader2, AlertTriangle, ShieldAlert, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';

const LIMIT = 30;

const TONE_BY_AKSI = {
  hapus_ba: 'alert',
  nonaktif_user: 'alert',
  nonaktif_item: 'alert',
  nonaktif_ruangan: 'alert',
  buat_ba: 'vital',
  buat_user: 'vital',
  buat_item: 'vital',
  buat_ruangan: 'vital',
  akses_master: 'seal',
};

export default function AuditLogPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [aksi, setAksi] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [aksiOptions, setAksiOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.auditLog({ aksi, limit: LIMIT, offset: page * LIMIT });
      setRows(d.rows);
      setTotal(d.total);
      setAksiOptions(d.aksiOptions);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, aksi, page]); // eslint-disable-line

  if (status === 'loading') {
    return <Layout><div className="py-16 text-center text-slate-500"><Loader2 className="animate-spin inline" /></div></Layout>;
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-16">
          <ShieldAlert size={40} className="text-[var(--color-alert-600)] mx-auto mb-3" />
          <h2 className="font-display font-bold text-lg text-[var(--color-navy-900)] mb-1.5">Akses Terbatas</h2>
          <p className="text-sm text-slate-500">Halaman ini hanya bisa diakses oleh akun admin.</p>
        </div>
      </Layout>
    );
  }

  const maxPage = Math.max(0, Math.ceil(total / LIMIT) - 1);

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-navy-900)]">Log Aktivitas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Jejak audit — siapa melakukan apa dan kapan</p>
        </div>

        <Card className="p-4">
          <Select value={aksi} onChange={(e) => { setAksi(e.target.value); setPage(0); }} className="sm:max-w-xs">
            <option value="">Semua Aksi</option>
            {Object.entries(aksiOptions).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Select>
        </Card>

        {error && (
          <div className="rounded-xl bg-[var(--color-alert-50)] border border-[var(--color-alert-100)] text-[var(--color-alert-700)] text-sm px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-16 justify-center">
            <Loader2 size={18} className="animate-spin" /> Memuat log...
          </div>
        ) : (
          <Card className="divide-y divide-[var(--color-line)]">
            {rows.map((r) => (
              <div key={r.id} className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-navy-50)] flex items-center justify-center shrink-0 mt-0.5">
                  <ScrollText size={15} className="text-[var(--color-navy-700)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill tone={TONE_BY_AKSI[r.aksi] || 'navy'}>{r.aksiLabel}</Pill>
                    <span className="text-sm font-medium text-[var(--color-navy-900)]">{r.username}</span>
                  </div>
                  {r.detail && <p className="text-sm text-slate-500 mt-1 break-words">{r.detail}</p>}
                  <p className="text-xs text-slate-400 mt-1">{r.timestamp}</p>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-center text-slate-400 py-10 text-sm">Belum ada aktivitas tercatat.</p>
            )}
          </Card>
        )}

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