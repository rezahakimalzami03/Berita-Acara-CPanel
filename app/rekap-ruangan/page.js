'use client';
import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api-client';
import { Card, Field, Input, Select, Button } from '@/components/ui';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2, TrendingUp, Boxes, FileStack, AlertTriangle, PackageSearch } from 'lucide-react';

function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function RekapRuanganPage() {
  const [ruanganList, setRuanganList] = useState([]);
  const [ruanganId, setRuanganId] = useState('');
  const [dari, setDari] = useState(todayStr(-30));
  const [sampai, setSampai] = useState(todayStr(0));
  const [data, setData] = useState(null);
  const [loadingRuangan, setLoadingRuangan] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRuangan = async () => {
    setLoadingRuangan(true);
    try {
      const d = await api.ruanganList();
      setRuanganList(d.ruangan);
      if (d.ruangan.length > 0) setRuanganId(d.ruangan[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingRuangan(false);
    }
  };

  const load = async () => {
    if (!ruanganId) return;
    setLoading(true);
    setError('');
    try {
      const d = await api.rekapRuangan(ruanganId, dari, sampai);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRuangan(); }, []); // eslint-disable-line
  useEffect(() => { if (ruanganId) load(); }, [ruanganId]); // eslint-disable-line

  const chartData = useMemo(
    () => (data?.daily || []).map((d) => ({ tanggal: d.tanggal.slice(5), total: d.total })),
    [data]
  );

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-navy-900)]">Rekap per Ruangan</h1>
          <p className="text-sm text-slate-500 mt-0.5">Detail pemakaian obat & alat untuk satu ruangan/unit</p>
        </div>

        <Card className="p-4 md:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Ruangan / Unit">
              {loadingRuangan ? (
                <div className="py-2.5"><Loader2 size={15} className="animate-spin text-slate-400" /></div>
              ) : (
                <Select value={ruanganId} onChange={(e) => setRuanganId(e.target.value)} className="min-w-[180px]">
                  {ruanganList.map((r) => (
                    <option key={r.id} value={r.id}>{r.nama}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Dari Tanggal"><Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} /></Field>
            <Field label="Sampai Tanggal"><Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} /></Field>
            <Button variant="primary" onClick={load} disabled={loading || !ruanganId}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : null} Terapkan
            </Button>
          </div>
        </Card>

        {error && (
          <div className="rounded-xl bg-[var(--color-alert-50)] border border-[var(--color-alert-100)] text-[var(--color-alert-700)] text-sm px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-16 justify-center">
            <Loader2 size={18} className="animate-spin" /> Memuat data...
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard icon={TrendingUp} label="Total Pemakaian" value={data.summary.totalPemakaian} sub={data.ruangan.nama} tone="navy" />
              <SummaryCard icon={PackageSearch} label="Obat Paling Sering Dipakai" value={data.summary.itemTerbanyak ? data.summary.itemTerbanyak.nama : '-'} sub={data.summary.itemTerbanyak ? `${data.summary.itemTerbanyak.totalTerpakai}x` : ''} tone="seal" />
              <SummaryCard icon={FileStack} label="Jumlah Berita Acara" value={data.summary.jumlahBA} sub="Pembukaan pada rentang ini" tone="vital" />
              <SummaryCard icon={Boxes} label="Jenis Obat/Alat" value={data.summary.jumlahJenisItem} sub="di ruangan ini" tone="alert" />
            </div>

            <Card className="p-5 md:p-6">
              <h3 className="font-display font-semibold text-[var(--color-navy-900)] mb-4">Tren Pemakaian Harian — {data.ruangan.nama}</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="fillTotalRuangan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1b3358" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1b3358" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e5ea" vertical={false} />
                    <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e5ea', fontSize: 12 }} />
                    <Area type="monotone" dataKey="total" stroke="#1b3358" strokeWidth={2} fill="url(#fillTotalRuangan)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <h3 className="font-display font-semibold text-[var(--color-navy-900)] mb-4">Rekap per Obat / Alat</h3>
              <div className="overflow-x-auto thin-scroll max-h-96">
                <table className="w-full text-sm min-w-[520px]">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="py-2 px-1">Nama Obat / Alat</th>
                      <th className="py-2 px-1">Satuan</th>
                      <th className="py-2 px-1 text-right">Jml. Standar</th>
                      <th className="py-2 px-1 text-right">Total Terpakai</th>
                      <th className="py-2 px-1 text-right">Jumlah Transaksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.perItem.map((it, i) => (
                      <tr key={i} className="border-t border-[var(--color-line)]">
                        <td className="py-1.5 px-1 font-medium text-[var(--color-navy-900)]">{it.nama}</td>
                        <td className="py-1.5 px-1 text-slate-500">{it.satuan}</td>
                        <td className="py-1.5 px-1 text-right text-slate-500">{it.jumlahStandar}</td>
                        <td className="py-1.5 px-1 text-right font-semibold">{it.totalTerpakai}</td>
                        <td className="py-1.5 px-1 text-right text-slate-500">{it.jumlahTransaksi}</td>
                      </tr>
                    ))}
                    {data.perItem.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-slate-400 py-6">Tidak ada data obat/alat untuk ruangan ini.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <h3 className="font-display font-semibold text-[var(--color-navy-900)] mb-4">Detail Pemakaian</h3>
              <div className="overflow-x-auto thin-scroll max-h-96">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="py-2 px-1">Tanggal</th>
                      <th className="py-2 px-1">Nama Obat</th>
                      <th className="py-2 px-1">Satuan</th>
                      <th className="py-2 px-1 text-right">Jumlah</th>
                      <th className="py-2 px-1">Nama Pasien</th>
                      <th className="py-2 px-1">No. RM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.details.map((d, i) => (
                      <tr key={i} className="border-t border-[var(--color-line)]">
                        <td className="py-1.5 px-1 text-slate-500">{d.tanggal.split('-').reverse().join('/')}</td>
                        <td className="py-1.5 px-1 font-medium text-[var(--color-navy-900)]">{d.nama}</td>
                        <td className="py-1.5 px-1 text-slate-500">{d.satuan}</td>
                        <td className="py-1.5 px-1 text-right font-semibold">{d.jumlah}</td>
                        <td className="py-1.5 px-1 text-slate-500">{d.namaPasien || '-'}</td>
                        <td className="py-1.5 px-1 text-slate-500">{d.noRm || '-'}</td>
                      </tr>
                    ))}
                    {data.details.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-slate-400 py-6">Tidak ada pemakaian pada rentang ini.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </Layout>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, tone }) {
  const tones = {
    navy: 'bg-[var(--color-navy-50)] text-[var(--color-navy-800)]',
    vital: 'bg-[var(--color-vital-50)] text-[var(--color-vital-700)]',
    seal: 'bg-[var(--color-seal-50)] text-[var(--color-seal-700)]',
    alert: 'bg-[var(--color-alert-50)] text-[var(--color-alert-700)]',
  };
  return (
    <Card className="p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${tones[tone]}`}>
        <Icon size={16} />
      </div>
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="font-display font-bold text-lg text-[var(--color-navy-900)] leading-tight mt-0.5 truncate">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </Card>
  );
}
