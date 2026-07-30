import Link from 'next/link'

// Tapa de los paneles LEGADOS de Rumbo (rrpp, local-panel, gestor, admin real):
// siguen en el código para reaprovecharlos con el backend de Tourneum, pero por
// URL enseñaban branding nocturno viejo y flujos muertos (Supabase retirado).
// Los layouts de esos grupos renderizan ESTO en lugar de sus hijos.
export function PanelEnObras({ nombre, demoHref, demoLabel }: { nombre: string; demoHref?: string; demoLabel?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#0D0F15]">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#E0BE63]/12 text-3xl">🚧</span>
      <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-[#8B8BA8] font-bold">{nombre}</p>
      <h1 className="mt-1 text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display, inherit)' }}>En obras</h1>
      <p className="mt-2 text-sm text-[#B8B8CC] max-w-sm leading-relaxed">
        Este panel se reconstruye sobre el backend nuevo de Tourneum. Mientras tanto, todo el recorrido se puede ver en la demo.
      </p>
      <div className="mt-5 flex gap-2">
        {demoHref && (
          <Link href={demoHref} className="h-11 px-4 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold inline-flex items-center">{demoLabel ?? 'Ver la demo'}</Link>
        )}
        <Link href="/explorar" className="h-11 px-4 rounded-xl bg-white/8 border border-white/15 text-white text-sm font-bold inline-flex items-center">Ir a la app</Link>
      </div>
    </div>
  )
}
