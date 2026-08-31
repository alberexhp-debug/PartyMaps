'use client'
import { useState } from 'react'
import Link from 'next/link'
import { UserSideNav } from '@/components/user/UserSideNav'
import { UserBottomNav } from '@/components/user/UserBottomNav'
import { AltaTOSheet } from '@/components/todh/PerfilDualCard'
import { BuzonCuenta } from '@/components/todh/BuzonCuenta'
import { useDemoStore, useEsTO } from '@/lib/stores/useDemoStore'
import { RequireSesion } from '@/components/todh/RequireSesion'
import { useT } from '@/lib/i18n'
import { Megaphone, Clock, ArrowLeft, ShieldCheck } from '@/components/todh/iconosTorneum'

// Shell del PANEL DEL TO con puerta doble: primero la sesión (solo JUGADOR —
// las sedes son solo sedes, sin perfil de organizador) y después la capa de
// TO — la trae de serie la cuenta to@ o se consigue con solicitud aprobada.
export default function TOLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSesion rol="jugador">
      <PuertaTO>{children}</PuertaTO>
    </RequireSesion>
  )
}

function PuertaTO({ children }: { children: React.ReactNode }) {
  const perfilTO = useDemoStore(s => s.perfilTO)
  const esTO = useEsTO()

  if (!esTO) return <GateTO estado={perfilTO === 'pendiente' ? 'pendiente' : 'no'} />

  // Mismo rail que la app de jugador: con perfil de TO el menú lateral se
  // expande en dos secciones (Jugador / Organizador) — un solo panel para todo.
  // En móvil/tablet la misma barra inferior que el resto de la app (el TO no
  // pierde la navegación al entrar en su zona); el main deja hueco para ella.
  return (
    <div className="min-h-screen lg:pl-[244px]">
      <UserSideNav />
      <main className="w-full pb-20 lg:pb-8 lg:pt-5 lg:px-8 relative">
        {children}
      </main>
      {/* Buzón cruzado: el TO también recibe avisos de otras cuentas aquí */}
      <BuzonCuenta />
      <UserBottomNav />
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
              <p className="text-[12px] text-[#E0BE63] font-bold flex items-center gap-1.5"><ShieldCheck size={13} /> {tr('gate.enRevision')}</p>
              <p className="mt-1 text-[12px] text-[#B8B8CC]">{tr('gate.revisionTexto')}</p>
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
