'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { FileText, LayoutDashboard, History, ShieldCheck, LogOut, Warehouse, Building2, Users, Bell, ScrollText } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Buat Berita Acara', icon: FileText },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rekap-ruangan', label: 'Rekap per Ruangan', icon: Building2 },
  { to: '/notifikasi', label: 'Notifikasi', icon: Bell },
  { to: '/riwayat', label: 'Riwayat', icon: History },
];
const adminNavItems = [
  { to: '/master', label: 'Master Ruangan', icon: Warehouse },
  { to: '/users', label: 'Kelola User', icon: Users },
  { to: '/audit-log', label: 'Log Aktivitas', icon: ScrollText },
];

export default function Layout({ children }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const allNavItems = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-[var(--color-navy-900)] text-white">
        <div className="px-6 py-6 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-seal-600)] flex items-center justify-center rotate-3">
            <ShieldCheck size={18} strokeWidth={2.5} className="text-white -rotate-3" />
          </div>
          <div>
            <p className="font-display font-bold text-sm leading-tight">Troli Emergency</p>
            <p className="text-[11px] text-white/50 leading-tight">Berita Acara Digital</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {allNavItems.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                href={to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={17} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-white/60 px-2 mb-2 truncate">{session?.user?.name}</p>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white w-full"
          >
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </aside>

      <header className="md:hidden flex items-center justify-between px-4 py-3.5 bg-[var(--color-navy-900)] text-white sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-seal-600)] flex items-center justify-center rotate-3">
            <ShieldCheck size={16} strokeWidth={2.5} className="text-white -rotate-3" />
          </div>
          <p className="font-display font-bold text-sm">Troli Emergency</p>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-white/60">
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[var(--color-line)] flex">
        {allNavItems.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
          return (
            <Link
              key={to}
              href={to}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? 'text-[var(--color-navy-800)]' : 'text-slate-400'
              }`}
            >
              <Icon size={19} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
