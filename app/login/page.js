'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', { username, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError('Username atau password salah.');
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-seal-600)] flex items-center justify-center rotate-3 mb-3">
            <ShieldCheck size={24} strokeWidth={2.5} className="text-white -rotate-3" />
          </div>
          <h1 className="font-display font-bold text-lg text-[var(--color-navy-900)]">Troli Emergency</h1>
          <p className="text-sm text-slate-500">Masuk untuk melanjutkan</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-[var(--color-line)] p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-[var(--color-alert-50)] border border-[var(--color-alert-100)] text-[var(--color-alert-700)] text-sm px-3 py-2.5 flex items-center gap-2">
              <AlertTriangle size={15} /> {error}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-900)] block mb-1.5">Username</label>
            <input
              className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy-700)]/30 focus:border-[var(--color-navy-700)]"
              value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-navy-900)] block mb-1.5">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy-700)]/30 focus:border-[var(--color-navy-700)]"
              value={password} onChange={(e) => setPassword(e.target.value)} required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--color-navy-800)] text-white text-sm font-semibold py-2.5 hover:bg-[var(--color-navy-700)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}
