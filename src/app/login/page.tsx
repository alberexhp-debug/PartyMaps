'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSesionStore, rutaInicial, CUENTAS_DEMO, type CuentaDemo } from '@/lib/stores/useSesionStore'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useT, type ClaveI18n } from '@/lib/i18n'
import { Eye, EyeOff, LogIn, KeyRound, User, Megaphone, Store, ShieldCheck } from 'lucide-react'

// Login de la DEMO: toda la app entra por aquí. Los accesos de un toque son la
// puerta de testeo: 6 jugadores vacíos, 1 jugador+TO (David), 3 sedes y el
// admin. Las cuentas legacy (jugador@/to@/local@) siguen entrando TECLEANDO el
// email, sin botón. Cuando exista el backend real, esto ataca Supabase Auth.

// Grupos del acceso rápido (se rellenan desde CUENTAS_DEMO sin ocultas).
const GRUPOS: {
  labelKey: ClaveI18n
  descKey: ClaveI18n
  icon: React.ElementType
  filtro: (c: CuentaDemo) => boolean
  cols2?: boolean
}[] = [
  { labelKey: 'ctas.jugadores', descKey: 'ctas.jugadorDesc', icon: User, filtro: c => c.rol === 'jugador' && !c.to, cols2: true },
  { labelKey: 'ctas.organizador', descKey: 'ctas.toDesc', icon: Megaphone, filtro: c => c.rol === 'jugador' && !!c.to },
  { labelKey: 'ctas.sedes', descKey: 'ctas.sedeDesc', icon: Store, filtro: c => c.rol === 'local' },
  { labelKey: 'ctas.admin', descKey: 'ctas.adminDesc', icon: ShieldCheck, filtro: c => c.rol === 'admin' },
]

function LoginDemo() {
  const { t: tr } = useT()
  const router = useRouter()
  const params = useSearchParams()
  const sesion = useSesionStore(s => s.sesion)
  const login = useSesionStore(s => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [error, setError] = useState('')
  const [hidratado, setHidratado] = useState(false)
  useEffect(() => setHidratado(true), [])

  // Ya con sesión → a su panel (el login no se enseña dos veces)
  useEffect(() => {
    if (hidratado && sesion) router.replace(rutaInicial(sesion))
  }, [hidratado, sesion, router])

  const entrar = (em = email, pw = password) => {
    const s = login(em, pw)
    if (!s) { setError(tr('login.error')); return }
    // El TO entra con su capa de organizador activa; el resto, como jugador
    const next = params.get('next')
    router.replace(next && next.startsWith('/') ? next : rutaInicial(s))
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-5 overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-[#B6FF3A]/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[34rem] w-[34rem] rounded-full bg-[#7C5CFF]/18 blur-[120px]" />

      <div className="relative w-full max-w-sm py-10">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <span className="w-10 h-10 rounded-xl bg-[#B6FF3A] flex items-center justify-center text-[#0A0A0F] text-base font-black text-display">T</span>
          <span className="text-xl font-black text-display uppercase tracking-[0.22em] text-white">Torneum</span>
        </div>

        <div className="card-premium p-5">
          <h1 className="text-xl font-bold text-white text-display">{tr('login.titulo')}</h1>
          <p className="mt-1 text-[13px] text-[#8B8BA8]">{tr('login.sub')}</p>

          <label className="block mt-4 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('login.correo')}</label>
          <input value={email} onChange={e => { setEmail(e.target.value); setError('') }} type="email" autoComplete="email" placeholder={tr('login.emailPh')}
            className="w-full h-12 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none"
            onKeyDown={e => { if (e.key === 'Enter') entrar() }} />

          <label className="block mt-3 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('login.password')}</label>
          <div className="relative">
            <input value={password} onChange={e => { setPassword(e.target.value); setError('') }} type={verPass ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
              className="w-full h-12 px-3.5 pr-11 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none"
              onKeyDown={e => { if (e.key === 'Enter') entrar() }} />
            <button onClick={() => setVerPass(v => !v)} aria-label="Ver contraseña" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8BA8] hover:text-white transition-colors">
              {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p className="mt-2.5 text-[12px] font-semibold text-[#FF8A8A]">{error}</p>}

          <button onClick={() => entrar()} className="mt-4 w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold flex items-center justify-center gap-2 glow-lime active:scale-[0.98] transition-transform">
            <LogIn size={16} /> {tr('login.entrar')}
          </button>
        </div>

        {/* Cuentas de muestra agrupadas: un toque rellena y entra */}
        <div className="mt-4 card-premium p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8B8BA8] font-bold flex items-center gap-1.5"><KeyRound size={12} /> {tr('login.cuentasDemo')}</p>
          {GRUPOS.map(({ labelKey, descKey, icon: Icon, filtro, cols2 }) => {
            const cuentas = CUENTAS_DEMO.filter(c => !c.oculta && filtro(c))
            if (cuentas.length === 0) return null
            return (
              <div key={labelKey} className="mt-3">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[#6B6B85] font-bold mb-1.5">
                  <Icon size={11} className="text-[#B6FF3A]" /> {tr(labelKey)}
                </p>
                <div className={cols2 ? 'grid grid-cols-2 gap-1.5' : 'space-y-1.5'}>
                  {cuentas.map(c => (
                    <button key={c.email} onClick={() => { setEmail(c.email); setPassword(c.password); entrar(c.email, c.password) }}
                      className="w-full rounded-xl bg-white/[0.04] border border-white/8 px-3 py-2 hover:bg-white/[0.08] hover:border-[#B6FF3A]/30 transition-colors text-left">
                      <span className="block text-[12px] font-bold text-white truncate">{c.nombre}</span>
                      <span className="block text-[10px] text-[#8B8BA8] truncate">{tr(descKey)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-5 text-center">
          <Link href="/inicio" className="text-[12px] text-[#8B8BA8] hover:text-white transition-colors">{tr('login.volver')}</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginDemo />
    </Suspense>
  )
}
