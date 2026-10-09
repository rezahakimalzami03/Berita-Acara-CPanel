'use client';
import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api-client';
import { Card, Field, Input, Button } from '@/components/ui';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2, TrendingUp, MapPin, Pill as PillIcon, PackageX, AlertTriangle } from 'lucide-react';

function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [dari, setDari] = useState(todayStr(-30));
  const [sampai, setSampai] = useState(todayStr(0));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.dashboard(dari, sampai);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const chartData = useMemo(
    () => (data?.daily || []).map((d) => ({ tanggal: d.tanggal.slice(5), total: d.total })),
    [data]
  );

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-[var(--color-navy-900)]">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Rekap pemakaian obat & alat seluruh unit</p>
          </div>
        </div>

        <Card className="p-4 md:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Dari Tanggal"><Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} /></Field>
            <Field label="Sampai Tanggal"><Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} /></Field>
            <Button variant="primary" onClick={load} disabled={loading}>
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
              <SummaryCard icon={TrendingUp} label="Total Pemakaian" value={data.summary.totalAll} tone="navy" />
              <SummaryCard icon={MapPin} label="Unit Terbanyak" value={data.summary.topUnit ? data.summary.topUnit.ruangan : '-'} sub={data.summary.topUnit ? `${data.summary.topUnit.total} item` : ''} tone="vital" />
              <SummaryCard icon={PillIcon} label="Obat Paling Banyak" value={data.summary.topObat ? data.summary.topObat.nama : '-'} sub={data.summary.topObat ? `${data.summary.topObat.total}x` : ''} tone="seal" />
              <SummaryCard icon={PackageX} label="Belum Pernah Dipakai" value={data.summary.zeroCount} sub="jenis obat/alat" tone="alert" />
            </div>

            <Card className="p-5 md:p-6">
              <h3 className="font-display font-semibold text-[var(--color-navy-900)] mb-4">Tren Pemakaian Harian</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1b3358" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1b3358" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e5ea" vertical={false} />
                    <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e5ea', fontSize: 12 }} />
                    <Area type="monotone" dataKey="total" stroke="#1b3358" strokeWidth={2} fill="url(#fillTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 gap-6">
              <Card className="p-5 md:p-6">
                <h3 className="font-display font-semibold text-[var(--color-navy-900)] mb-4">Total per Ruangan / Unit</h3>
                <SimpleTable rows={[...data.perRuangan].sort((a, b) => b.total - a.total)} columns={[{ key: 'ruangan', label: 'Ruangan' }, { key: 'total', label: 'Total', align: 'right' }]} />
              </Card>
              <Card className="p-5 md:p-6">
                <h3 className="font-display font-semibold text-[var(--color-navy-900)] mb-4">Total per Obat / Alat</h3>
                <SimpleTable rows={[...data.perObat].sort((a, b) => b.total - a.total).slice(0, 20)} columns={[{ key: 'nama', label: 'Nama' }, { key: 'total', label: 'Total', align: 'right' }]} />
              </Card>
            </div>

            <Card className="p-5 md:p-6">
              <h3 className="font-display font-semibold text-[var(--color-navy-900)] mb-4">Detail Pemakaian Harian</h3>
              <div className="overflow-x-auto thin-scroll max-h-96">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="py-2 px-1">Tanggal</th>
                      <th className="py-2 px-1">Ruangan</th>
                      <th className="py-2 px-1">Nama Obat</th>
                      <th className="py-2 px-1">Satuan</th>
                      <th className="py-2 px-1 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.details.map((d, i) => (
                      <tr key={i} className="border-t border-[var(--color-line)]">
                        <td className="py-1.5 px-1 text-slate-500">{d.tanggal.split('-').reverse().join('/')}</td>
                        <td className="py-1.5 px-1 font-medium text-[var(--color-navy-900)]">{d.ruangan}</td>
                        <td className="py-1.5 px-1">{d.nama}</td>
                        <td className="py-1.5 px-1 text-slate-500">{d.satuan}</td>
                        <td className="py-1.5 px-1 text-right font-semibold">{d.jumlah}</td>
                      </tr>
                    ))}
                    {data.details.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-slate-400 py-6">Tidak ada pemakaian pada rentang ini.</td></tr>
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

function SimpleTable({ rows, columns }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400 text-center py-6">Tidak ada data.</p>;
  return (
    <div className="overflow-x-auto thin-scroll max-h-72">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {columns.map((c) => <th key={c.key} className={`py-2 px-1 ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[var(--color-line)]">
              {columns.map((c) => (
                <td key={c.key} className={`py-1.5 px-1 ${c.align === 'right' ? 'text-right font-semibold' : 'font-medium text-[var(--color-navy-900)]'}`}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
