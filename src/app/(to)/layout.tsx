'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TOSideNav } from '@/components/todh/TOSideNav'
import { AltaTOSheet } from '@/components/todh/PerfilDualCard'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { Megaphone, Clock, ArrowLeft, ShieldCheck } from 'lucide-react'

// Shell del PANEL DEL TO con puerta de rol: aquí solo entran cuentas con el
// perfil de organizador aprobado. Un jugador ve la puerta (solicitar → el admin
// aprueba → perfil dual activo); así los dos mundos no se mezclan.
export default function TOLayout({ children }: { children: React.ReactNode }) {
  const perfilTO = useDemoStore(s => s.perfilTO)
  // Espera a la rehidratación del store persistido para no parpadear la puerta
  // a un TO ya aprobado (el servidor no conoce localStorage).
  const [hidratado, setHidratado] = useState(false)
  useEffect(() => setHidratado(true), [])
  if (!hidratado) return <div className="min-h-screen" />

  if (perfilTO !== 'aprobado') return <GateTO estado={perfilTO} />

  return (
    <div className="min-h-screen lg:pl-[244px]">
      <TOSideNav />
      <main className="w-full lg:pt-5 lg:px-8 relative">
        {children}
      </main>
    </div>
  )
}

function GateTO({ estado }: { estado: 'no' | 'pendiente' }) {
  const { t: tr } = useT()
  const [alta, setAlta] = useState(false)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm w-full">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${estado === 'pendiente' ? 'bg-[#E0BE63]/12 text-[#E0BE63]' : 'bg-[#B6FF3A]/12 text-[#B6FF3A]'}`}>
          {estado === 'pendiente' ? <Clock size={30} /> : <Megaphone size={30} />}
        </span>
        <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-[#8B8BA8] font-bold">{tr('gate.eyebrow')}</p>

        {estado === 'pendiente' ? (
          <>
            <h1 className="mt-1 text-2xl font-bold text-white text-display">{tr('gate.pendiente')}</h1>
            <p className="mt-2 text-sm text-[#B8B8CC] leading-relaxed">{tr('gate.pendienteTexto')}</p>
            <div className="mt-5 rounded-2xl border border-[#E0BE63]/30 bg-[#E0BE63]/[0.06] p-3.5 text-left">
              <p className="text-[12px] text-[#E0BE63] font-bold flex items-center gap-1.5"><ShieldCheck size={13} /> Demo</p>
              <p className="mt-1 text-[12px] text-[#B8B8CC]">La aprobación la hace el equipo desde el panel de administración.</p>
              <Link href="/admin-demo" className="mt-2 inline-flex h-9 px-3.5 items-center rounded-xl bg-[#E0BE63] text-[#0A0A0F] text-xs font-bold">Abrir panel admin y aprobarla ›</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-bold text-white text-display">{tr('gate.titulo')}</h1>
            <p className="mt-2 text-sm text-[#B8B8CC] leading-relaxed">{tr('gate.texto')}</p>
            <button onClick={() => setAlta(true)}
              className="mt-5 w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold">{tr('gate.solicitar')}</button>
          </>
        )}

        <Link href="/explorar" className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#8B8BA8] font-semibold hover:text-white transition-colors">
          <ArrowLeft size={14} /> {tr('gate.volver')}
        </Link>
      </div>
      {alta && <AltaTOSheet onClose={() => setAlta(false)} />}
    </div>
  )
}
