'use client';

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-[var(--color-line)] shadow-[0_1px_2px_rgba(15,28,48,0.04)] ${className}`}>
      {children}
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[var(--color-navy-800)] text-white hover:bg-[var(--color-navy-700)]',
    success: 'bg-[var(--color-vital-600)] text-white hover:bg-[var(--color-vital-700)]',
    ghost: 'bg-transparent text-[var(--color-navy-800)] hover:bg-[var(--color-navy-50)] border border-[var(--color-line)]',
    danger: 'bg-[var(--color-alert-600)] text-white hover:bg-[var(--color-alert-700)]',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-[var(--color-navy-900)]">
          {label}{required && <span className="text-[var(--color-alert-600)] ml-0.5">*</span>}
        </span>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputBase = 'w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm text-[var(--color-navy-900)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-navy-700)]/30 focus:border-[var(--color-navy-700)] transition';

export function Input(props) {
  return <input className={inputBase} {...props} />;
}

export function Select({ children, className = '', ...props }) {
  return (
    <select className={`${inputBase} appearance-none pr-9 ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea(props) {
  return <textarea className={`${inputBase} min-h-[80px] resize-y`} {...props} />;
}

export function Pill({ children, tone = 'navy' }) {
  const tones = {
    navy: 'bg-[var(--color-navy-100)] text-[var(--color-navy-800)]',
    vital: 'bg-[var(--color-vital-100)] text-[var(--color-vital-700)]',
    seal: 'bg-[var(--color-seal-100)] text-[var(--color-seal-700)]',
    alert: 'bg-[var(--color-alert-100)] text-[var(--color-alert-700)]',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function SectionTitle({ step, title, desc }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      {step && (
        <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--color-navy-800)] text-white text-xs font-bold flex items-center justify-center font-mono mt-0.5">
          {step}
        </span>
      )}
      <div>
        <h3 className="font-display font-semibold text-[var(--color-navy-900)] text-base">{title}</h3>
        {desc && <p className="text-sm text-slate-500 mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}
