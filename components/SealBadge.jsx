'use client';

export default function SealBadge({ nomor, jenis }) {
  if (!nomor) return null;
  const isOpen = jenis === 'Pembukaan';
  return (
    <div
      className={`seal-badge inline-flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-2 -rotate-2 ${
        isOpen
          ? 'border-[var(--color-vital-600)] bg-[var(--color-vital-50)]'
          : 'border-[var(--color-seal-600)] bg-[var(--color-seal-50)]'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-[var(--color-vital-600)]' : 'bg-[var(--color-seal-600)]'}`} />
      <span className="font-mono text-sm font-semibold tracking-tight text-[var(--color-navy-900)]">{nomor}</span>
    </div>
  );
}
