'use client';
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api-client';
import { Card, Pill } from '@/components/ui';
import { Loader2, AlertTriangle, PackageX, CalendarClock, CheckCircle2 } from 'lucide-react';

export default function NotifikasiPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const d = await api.notifikasi();
        setData(d);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-navy-900)]">Notifikasi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Stok kosong & obat/alat yang mendekati kadaluarsa</p>
        </div>

        {error && (
          <div className="rounded-xl bg-[var(--color-alert-50)] border border-[var(--color-alert-100)] text-[var(--color-alert-700)] text-sm px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-16 justify-center">
            <Loader2 size={18} className="animate-spin" /> Memuat notifikasi...
          </div>
        ) : data ? (
          <>
            {data.totalNotifikasi === 0 && (
              <Card className="p-8 text-center">
                <CheckCircle2 size={36} className="text-[var(--color-vital-600)] mx-auto mb-3" />
                <p className="font-display font-semibold text-[var(--color-navy-900)]">Semua aman</p>
                <p className="text-sm text-slate-500 mt-1">Tidak ada stok kosong maupun obat yang mendekati kadaluarsa.</p>
              </Card>
            )}

            {data.stokKosong.length > 0 && (
              <Card className="p-5 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-alert-50)] flex items-center justify-center">
                    <PackageX size={16} className="text-[var(--color-alert-700)]" />
                  </div>
                  <h3 className="font-display font-semibold text-[var(--color-navy-900)]">
                    Stok Kosong / Habis Terpakai ({data.stokKosong.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Berdasarkan sisa stok pada Berita Acara Pembukaan terakhir tiap ruangan.
                </p>
                <div className="overflow-x-auto thin-scroll">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="py-2 px-1">Ruangan</th>
                        <th className="py-2 px-1">Nama Obat / Alat</th>
                        <th className="py-2 px-1 text-right">Sisa Stok</th>
                        <th className="py-2 px-1 text-right">Standar</th>
                        <th className="py-2 px-1">Data Terakhir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.stokKosong.map((s, i) => (
                        <tr key={i} className="border-t border-[var(--color-line)]">
                          <td className="py-1.5 px-1 text-slate-500">{s.ruangan}</td>
                          <td className="py-1.5 px-1 font-medium text-[var(--color-navy-900)]">{s.nama}</td>
                          <td className="py-1.5 px-1 text-right font-semibold text-[var(--color-alert-700)]">{s.sisaStok} {s.satuan}</td>
                          <td className="py-1.5 px-1 text-right text-slate-500">{s.jumlahStandar}</td>
                          <td className="py-1.5 px-1 text-slate-400">{s.tanggalTerakhir}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {data.kadaluarsa.length > 0 && (
              <Card className="p-5 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <CalendarClock size={16} className="text-amber-600" />
                  </div>
                  <h3 className="font-display font-semibold text-[var(--color-navy-900)]">
                    Mendekati / Sudah Kadaluarsa ({data.kadaluarsa.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Item dengan tanggal kadaluarsa dalam 30 hari ke depan, atau sudah lewat.
                  Data ini diisi manual oleh admin lewat halaman Master Ruangan.
                </p>
                <div className="overflow-x-auto thin-scroll">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="py-2 px-1">Ruangan</th>
                        <th className="py-2 px-1">Nama Obat / Alat</th>
                        <th className="py-2 px-1">No. Batch</th>
                        <th className="py-2 px-1">Exp. Date</th>
                        <th className="py-2 px-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.kadaluarsa.map((k) => (
                        <tr key={k.id} className="border-t border-[var(--color-line)]">
                          <td className="py-1.5 px-1 text-slate-500">{k.ruangan}</td>
                          <td className="py-1.5 px-1 font-medium text-[var(--color-navy-900)]">{k.nama}</td>
                          <td className="py-1.5 px-1 text-slate-500">{k.noBatch || '-'}</td>
                          <td className="py-1.5 px-1 text-slate-500">{k.expDate}</td>
                          <td className="py-1.5 px-1">
                            {k.sudahExpired
                              ? <Pill tone="alert">Sudah expired</Pill>
                              : <Pill tone="alert">{k.sisaHari} hari lagi</Pill>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </Layout>
  );
}