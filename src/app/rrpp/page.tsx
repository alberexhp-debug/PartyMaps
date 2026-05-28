'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Link as LinkIcon, Users, Wallet, ExternalLink } from 'lucide-react'

type Venue = {
  id: string; rrpp_id: string; local_id: string;
  comision_pct: number; estado: 'pendiente' | 'activa' | 'pausada' | 'archivada';
  locales: { id: string; nombre: string; foto_url: string | null; tier: string }
}
type Liquidacion = {
  id: string; local_id: string; periodo: string;
  monto_total: number; num_ventas: number;
  estado: 'pendiente' | 'marcado_pagado' | 'confirmado' | 'disputado';
}
type RRPP = {
  id: string; slug: string; nombre_publico: string; foto_url: string | null;
  bio: string | null; instagram: string | null; tiktok: string | null;
}

export default function PanelRRPP() {
  const [rrpp, setRrpp] = useState<RRPP | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [liqs, setLiqs] = useState<Liquidacion[]>([])
  const [loading, setLoading] = useState(true)
  const [noActivado, setNoActivado] = useState(false)

  useEffect(() => { void cargar() }, [])

  async function cargar() {
    setLoading(true)
    const r = await fetch('/api/rrpp/perfil', { credentials: 'include' })
    if (r.status === 401) { setNoActivado(true); setLoading(false); return }
    const j = await r.json()
    setRrpp(j.rrpp); setVenues(j.venues ?? []); setLiqs(j.liquidaciones ?? [])
    setLoading(false)
  }

  if (loading) return <div className="p-6"><div className="skeleton h-32 rounded-2xl" /></div>
  if (noActivado || !rrpp) return <ActivarRRPP onActivado={cargar} />

  const pendiente = liqs.filter(l => l.estado === 'pendiente').reduce((s, l) => s + Number(l.monto_total), 0)
  const ventasMes = liqs.reduce((s, l) => s + l.num_ventas, 0)
  const totalMes = liqs.reduce((s, l) => s + Number(l.monto_total), 0)

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <header className="flex items-center gap-3">
          {rrpp.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rrpp.foto_url} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-rose-400/20 flex items-center justify-center text-display">
              {rrpp.nombre_publico.slice(0, 1)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-display text-2xl truncate">{rrpp.nombre_publico}</h1>
            <a href={`/r/${rrpp.slug}`} target="_blank" rel="noreferrer"
              className="text-secondary text-xs inline-flex items-center gap-1 hover:underline">
              partymaps.com/r/{rrpp.slug} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-2">
          <Kpi label="Ventas mes" valor={ventasMes.toString()} icon={Sparkles} />
          <Kpi label="Total mes" valor={`${totalMes.toFixed(0)}€`} icon={Wallet} />
          <Kpi label="Pendiente" valor={`${pendiente.toFixed(0)}€`} icon={Wallet} accent />
        </section>

        <section>
          <h2 className="eyebrow eyebrow-rose mb-3">Locales</h2>
          {venues.length === 0 ? (
            <p className="text-tertiary text-sm">Aún no trabajas con ningún local. Pide que te inviten al panel desde tu slug <code>{rrpp.slug}</code>.</p>
          ) : (
            <div className="space-y-2">
              {venues.map(v => (
                <div key={v.id} className="card-premium p-3 flex items-center gap-3">
                  {v.locales.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.locales.foto_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-display text-base truncate">{v.locales.nombre}</p>
                    <p className="text-tertiary text-xs">
                      {v.estado === 'pendiente' ? 'Pendiente de tu aceptación' : `${v.comision_pct}% por venta · ${v.estado}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="eyebrow eyebrow-rose mb-2 flex items-center gap-2">
            <LinkIcon className="w-4 h-4" /> Acciones
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/rrpp/links" className="card-premium p-3 text-center">
              <p className="text-display text-base">Mis links</p>
              <p className="text-tertiary text-xs">Generar y compartir</p>
            </Link>
            <Link href="/rrpp/listas" className="card-premium p-3 text-center">
              <p className="text-display text-base">Mis listas</p>
              <p className="text-tertiary text-xs">Invitar gente</p>
            </Link>
          </div>
        </section>

        <footer className="text-center text-tertiary text-xs pt-6 border-t border-white/5">
          PartyMaps no procesa el pago entre tú y el local. Las cifras de arriba son
          lo que el local te debe según las ventas atribuidas. El pago lo gestionáis vosotros.
        </footer>
      </div>
    </div>
  )
}

function Kpi({ label, valor, icon: Icon, accent }: { label: string; valor: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className={`card-premium p-3 text-center ${accent ? 'ring-1 ring-rose-400/40' : ''}`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${accent ? 'text-rose-300' : 'text-white/60'}`} />
      <p className="text-display text-xl">{valor}</p>
      <p className="text-tertiary text-xs">{label}</p>
    </div>
  )
}

function ActivarRRPP({ onActivado }: { onActivado: () => void }) {
  const [nombrePublico, setNombrePublico] = useState('')
  const [slug, setSlug] = useState('')
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [aceptaEdad, setAceptaEdad] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    setError(null); setEnviando(true)
    const r = await fetch('/api/rrpp/activar', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_publico: nombrePublico,
        slug: slug || undefined,
        bio: bio || undefined,
        instagram: instagram.replace(/^@/, '') || undefined,
        edad_18_confirmada: aceptaEdad,
      }),
    })
    const j = await r.json()
    setEnviando(false)
    if (!r.ok) { setError(j.error || 'Error'); return }
    onActivado()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-4 sm:p-8 space-y-5">
        <Sparkles className="w-12 h-12 text-rose-400" />
        <div>
          <h1 className="text-display text-3xl">Activa tu modo RRPP</h1>
          <p className="text-secondary text-sm mt-1">
            Tu cartera es tuya. Trabaja con quien quieras. Las cifras son transparentes.
            El pago lo pactas con cada local — PartyMaps solo lleva la cuenta.
          </p>
        </div>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Nombre público</span>
          <input value={nombrePublico} onChange={e => setNombrePublico(e.target.value)}
            placeholder="Leo Noches" className="input mt-1 w-full" />
        </label>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Slug (URL pública)</span>
          <input value={slug} onChange={e => setSlug(e.target.value)}
            placeholder="leo-noches" className="input mt-1 w-full" />
          <span className="text-tertiary text-xs">partymaps.com/r/{slug || 'leo-noches'}</span>
        </label>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Bio (opcional)</span>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            placeholder="Llevo noches únicas a los mejores locales de Madrid"
            className="input mt-1 w-full" />
        </label>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Instagram (opcional)</span>
          <input value={instagram} onChange={e => setInstagram(e.target.value)}
            placeholder="leo.noches" className="input mt-1 w-full" />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={aceptaEdad}
            onChange={e => setAceptaEdad(e.target.checked)} className="mt-1" />
          <span>Confirmo que soy mayor de 18 años y que cualquier obligación fiscal por
            comisiones cobradas es mía, no de PartyMaps.</span>
        </label>
        {error && <p className="text-rose-300 text-sm">{error}</p>}
        <button onClick={enviar} disabled={!nombrePublico || !aceptaEdad || enviando}
          className="btn-primary w-full">
          {enviando ? 'Activando...' : 'Activar modo RRPP'}
        </button>
      </div>
    </div>
  )
}
