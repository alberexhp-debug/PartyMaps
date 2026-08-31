'use client'
import { useState } from 'react'
import type { TorneoSample } from '@/lib/torneos/sample'
import { ShieldCheck, ChevronDown } from '@/components/todh/iconosTorneum'
import { ScrollText } from 'lucide-react'
import { useT } from '@/lib/i18n'

// Reglas del torneo en un DESPLEGABLE: el reglamento lo escribe el TO al crear
// el torneo (t.reglas, una regla por línea) y debajo van las reglas estándar
// de la plataforma. Cerrado por defecto para no recargar la ficha.
export function ReglasTorneo({ t, abiertoInicial = false }: { t: TorneoSample; abiertoInicial?: boolean }) {
  const { t: tr } = useT()
  const [abierto, setAbierto] = useState(abiertoInicial)
  const propias = (t.reglas ?? '').split('\n').map(l => l.trim()).filter(Boolean)
  const estandar = [
    `${t.bestOf || 'Best of 3'} · ${t.formato}.`,
    tr('reglas.consenso'),
    tr('reglas.seeding'),
    ...(t.online ? [tr('reglas.codigoSala')] : []),
  ]

  return (
    <div className="card-premium overflow-hidden">
      <button onClick={() => setAbierto(a => !a)} aria-expanded={abierto}
        className="w-full flex items-center gap-3 p-4 text-left">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#B6FF3A]/12 text-[#B6FF3A] shrink-0"><ScrollText size={16} /></span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{tr('ct.reglasTitulo')}</p>
          <p className="text-[11px] text-[#8B8BA8]">{propias.length > 0 ? `${propias.length + estandar.length} ${tr('reglas.nCount')}` : `${estandar.length} ${tr('reglas.nEstandar')}`}</p>
        </div>
        <ChevronDown size={16} className={`text-[#8B8BA8] transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div className="px-4 pb-4 animate-slide-up-sm">
          {propias.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8B8BA8] font-bold mb-1.5">{tr('torneo.delOrganizador')}</p>
              <ul className="space-y-2 text-sm text-[#B8B8CC] mb-3">
                {propias.map((r, i) => (
                  <li key={i} className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> {r}</li>
                ))}
              </ul>
            </>
          )}
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#8B8BA8] font-bold mb-1.5">{tr('reglas.estandarTitulo')}</p>
          <ul className="space-y-2 text-sm text-[#8B8BA8]">
            {estandar.map((r, i) => (
              <li key={i} className="flex gap-2"><ShieldCheck size={15} className="text-[#8B8BA8] shrink-0 mt-0.5" /> {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
