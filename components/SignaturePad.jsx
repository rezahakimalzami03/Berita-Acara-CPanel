'use client';

import { useRef, useEffect, useState } from 'react';

export default function SignaturePad({ label, value, onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#16233a';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;

    const pos = (evt) => {
      const r = canvas.getBoundingClientRect();
      const scaleX = canvas.width / r.width, scaleY = canvas.height / r.height;
      const p = evt.touches ? evt.touches[0] : evt;
      return { x: (p.clientX - r.left) * scaleX, y: (p.clientY - r.top) * scaleY };
    };
    const start = (e) => { drawingRef.current = true; hasDrawnRef.current = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); };
    const move = (e) => { if (!drawingRef.current) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); };
    const end = () => { drawingRef.current = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, [open]);

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  };

  const save = () => {
    if (!hasDrawnRef.current) return;
    onChange(canvasRef.current.toDataURL('image/png'));
    setOpen(false);
  };

  return (
    <div>
      <span className="text-sm font-medium text-[var(--color-navy-900)] block mb-1.5">{label}</span>
      {value ? (
        <div className="border border-[var(--color-line)] rounded-lg p-2 bg-white flex items-center justify-between gap-3">
          <img src={value} alt={`Tanda tangan ${label}`} className="h-12 object-contain" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-semibold text-[var(--color-navy-700)] hover:underline shrink-0"
          >
            Ganti tanda tangan
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border-2 border-dashed border-[var(--color-line)] py-3.5 text-sm font-medium text-slate-500 hover:border-[var(--color-navy-700)] hover:text-[var(--color-navy-700)] transition"
        >
          ✍️ Ketuk untuk tanda tangan
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-[var(--color-navy-900)] mb-2">Tanda Tangan: {label}</p>
            <canvas
              ref={canvasRef}
              width={380}
              height={220}
              className="w-full border-2 border-[var(--color-navy-800)] rounded-lg bg-white touch-none"
            />
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={clear} className="flex-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold py-2.5">🗑️ Hapus</button>
              <button type="button" onClick={save} className="flex-1 rounded-lg bg-[var(--color-vital-600)] text-white text-sm font-semibold py-2.5">💾 Simpan</button>
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-[var(--color-alert-600)] text-white text-sm font-semibold py-2.5">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
