'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BadgeCheck, Check, ExternalLink, MapPin } from 'lucide-react'
import { useDemoStore, useEsTO, useOrgId } from '@/lib/stores/useDemoStore'
import { organizadorEfectivo, JUEGOS_LIST } from '@/lib/torneos/sample'
import { GameIcon } from '@/components/todh/GameIcon'
import { useToast } from '@/components/ui/Toast'
import { useT } from '@/lib/i18n'

// Perfil de organizador EDITABLE (decisión Albert 30-08): vive dentro del
// apartado Perfil, no en la consola. Lo que se guarda aquí (perfilesOrg, clave
// de MUNDO) lo funde organizadorEfectivo() y lo ven todas las cuentas en
// /organizador/[id], /mi-pagina y las fichas de torneo.
const COLORES_MARCA = ['#B6FF3A', '#9B82FF', '#4F8EF7', '#2EC4B6', '#E0BE63', '#FF8A5C', '#FF6B8A', '#E8E8F0']

// Detección de montaje sin setState-en-efecto: false en SSR/hidratación,
// true en cliente (el patrón que recomienda la regla react-hooks del repo).
const suscribirNada = () => () => {}
const useHidratado = () => useSyncExternalStore(suscribirNada, () => true, () => false)

export default function PerfilOrganizadorEditablePage() {
  const router = useRouter()
  const esTO = useEsTO()
  const orgId = useOrgId()
  const hidratado = useHidratado()

  // Sin rol de organizador aquí no hay nada que editar: al perfil.
  useEffect(() => { if (hidratado && !esTO) router.replace('/perfil') }, [hidratado, esTO, router])

  // El editor se monta ya hidratado: sus useState arrancan con el perfil
  // efectivo actual (muestra + overrides) sin efectos de sincronización.
  if (!hidratado || !esTO) return <div className="min-h-screen" />
  return <EditorPerfilOrg orgId={orgId} />
}

function EditorPerfilOrg({ orgId }: { orgId: string }) {
  const { t: tr } = useT()
  const router = useRouter()
  const toast = useToast()
  const editarPerfilOrg = useDemoStore(s => s.editarPerfilOrg)
  // Suscripción para refrescar la vista previa al guardar (organizadorEfectivo
  // lee este mismo slice a través del lector registrado).
  useDemoStore(s => s.perfilesOrg)

  const inicial = organizadorEfectivo(orgId)
  const [nombre, setNombre] = useState(inicial.nombre)
  const [handle, setHandle] = useState(inicial.handle ?? `@${orgId}`)
  const [ciudad, setCiudad] = useState(inicial.ciudad)
  const [bio, setBio] = useState(inicial.bio ?? '')
  const [color, setColor] = useState(inicial.color)
  const [juegos, setJuegos] = useState<string[]>(inicial.juegos)

  const org = organizadorEfectivo(orgId)

  const guardar = () => {
    // Ojo: `@${…}` nunca es falsy — el fallback va sobre el handle limpio.
    const handleLimpio = handle.trim().replace(/^@+/, '')
    editarPerfilOrg(orgId, {
      nombre: nombre.trim() || org.nombre,
      handle: handleLimpio ? `@${handleLimpio}` : org.handle,
      ciudad: ciudad.trim() || org.ciudad,
      bio: bio.trim().slice(0, 200),
      color,
      juegos,
    })
    toast.success(`${tr('pfo.guardado')} · ${tr('pfo.guardadoSub')}`)
  }

  return (
    <div className="relative min-h-screen pb-10">
      <div className="px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
        <div className="flex items-center gap-3 lg:max-w-5xl lg:mx-auto">
          <button onClick={() => router.push('/perfil')} aria-label={tr('comun.atras')} className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{tr('nav.perfil')}</p>
            <p className="text-base font-bold text-white">{tr('pfo.titulo')}</p>
          </div>
          <Link href="/mi-pagina" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl glass-strong text-[12px] font-bold text-[#B8B8CC] hover:text-white transition-colors shrink-0">
            <ExternalLink size={13} /> {tr('pf.verPagina')}
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 lg:max-w-5xl lg:mx-auto">
        <p className="text-[13px] text-[#8B8BA8]">{tr('pfo.sub')}</p>

        {/* Vista previa: la identidad tal y como la pinta la página pública */}
        <div className="card-premium p-4">
          <div className="flex items-center gap-3.5">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-xl font-black text-[#0A0A0F] shrink-0" style={{ background: color }}>{(nombre.trim() || org.nombre)[0]}</span>
            <div className="min-w-0">
              <p className="text-base font-bold text-white text-display leading-tight inline-flex items-center gap-1.5">
                {nombre.trim() || org.nombre}
                {org.verificado && <BadgeCheck size={15} className="text-[#4F8EF7] shrink-0" />}
              </p>
              <p className="text-xs text-[#8B8BA8]">@{handle.trim().replace(/^@+/, '') || orgId}</p>
              <p className="text-[11px] text-[#8B8BA8] inline-flex items-center gap-1 mt-0.5"><MapPin size={10} /> {ciudad.trim() || org.ciudad}</p>
            </div>
          </div>
          {bio.trim() && <p className="mt-3 text-[13px] text-[#B8B8CC] leading-relaxed">{bio.trim()}</p>}
        </div>

        <div className="card-premium p-4">
          <label className="block text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('pfo.lblNombre')}</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={40}
            className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('pfo.lblHandle')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8B8BA8]">@</span>
                <input value={handle.replace(/^@+/, '')} onChange={e => setHandle(e.target.value.replace(/\s/g, ''))} maxLength={24}
                  className="w-full h-11 pl-7 pr-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('pfo.lblCiudad')}</label>
              <input value={ciudad} onChange={e => setCiudad(e.target.value)} maxLength={30}
                className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
            </div>
          </div>

          <label className="block mt-3 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('pfo.lblBio')}</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={200} placeholder={tr('pfo.bioPh')}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none resize-none" />
          <p className="mt-1 text-right text-[10px] text-[#6B6B85] font-mono-num">{bio.length}/200</p>

          <label className="block mt-2 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('pfo.lblColor')}</label>
          <div className="flex flex-wrap gap-2">
            {COLORES_MARCA.map(c => (
              <button key={c} onClick={() => setColor(c)} aria-label={c}
                className={`h-9 w-9 rounded-xl transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0D0F15]' : 'opacity-80 hover:opacity-100'}`}
                style={{ background: c }}>
                {color === c && <Check size={15} className="mx-auto text-[#0A0A0F]" />}
              </button>
            ))}
          </div>

          <label className="block mt-4 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('pfo.lblJuegos')}</label>
          <div className="flex flex-wrap gap-1.5">
            {JUEGOS_LIST.map(j => {
              const on = juegos.includes(j.id)
              return (
                <button key={j.id} onClick={() => setJuegos(prev => on ? prev.filter(x => x !== j.id) : [...prev, j.id])}
                  className="px-2.5 h-8 rounded-full text-[12px] font-bold border transition-all inline-flex items-center gap-1.5"
                  style={on ? { background: `${j.color}22`, color: j.color, borderColor: `${j.color}77` } : { background: 'rgba(255,255,255,.05)', color: '#9A9AAE', borderColor: 'transparent' }}>
                  <GameIcon juegoId={j.id} size={13} /> {j.corto}
                </button>
              )
            })}
          </div>

          <button onClick={guardar} className="mt-5 w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold glow-lime active:scale-[0.98] transition-transform">
            {tr('pfo.guardar')}
          </button>
        </div>
      </div>
    </div>
  )
}
