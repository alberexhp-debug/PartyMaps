import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin, Handshake, Monitor, Wallet, Star, ShieldCheck, ArrowRight, Check } from 'lucide-react'

export const metadata: Metadata = {
  title: 'TODH para locales — llena tu sala con torneos',
  description: 'Ofrece tu sala a organizadores de torneos, publica tu disponibilidad y cobra tu parte automáticamente. Aparece en el mapa de torneos. Sin permanencia. Empieza gratis.',
}

const MODULOS = [
  { icon: MapPin, titulo: 'En el mapa de torneos', texto: 'Tu sala aparece en el mapa que miran los jugadores cuando buscan dónde competir. Aparecer es gratis.' },
  { icon: Handshake, titulo: 'Trabaja con organizadores', texto: 'Publica tu disponibilidad y recibe solicitudes de TOs. Reserva directa para los de confianza, solicitud para los nuevos.' },
  { icon: Monitor, titulo: 'Gestiona tus setups', texto: 'Define consolas, PCs, mesas y el setup de stream. Su estado en vivo alimenta el modo directo del organizador.' },
  { icon: Wallet, titulo: 'Cobra tu parte automática', texto: 'Cuota fija, por setup, por hora o % de las inscripciones. El reparto TO↔local se paga solo vía Stripe Connect.' },
  { icon: Star, titulo: 'Reputación que vende', texto: 'Estrellas, número de torneos e insignias. Una buena reputación atrae a los mejores organizadores.' },
  { icon: ShieldCheck, titulo: 'Sin permanencia', texto: 'Pruébalo sin ataduras. Si no te sirve, te vas cuando quieras. Tus datos son tuyos.' },
]

const PASOS = [
  { n: 1, titulo: 'Registra tu sala', texto: 'En 5 minutos: nombre, dirección, fotos y nº de setups. Lo revisamos y te damos de alta.' },
  { n: 2, titulo: 'Publica disponibilidad', texto: 'Horario recurrente y precio de sala. Define tu lista de TOs de confianza. Te guiamos paso a paso.' },
  { n: 3, titulo: 'Aloja torneos', texto: 'Apareces en el mapa, recibes solicitudes de organizadores y tus ingresos van llegando a tu panel en vivo.' },
]

const FAQ = [
  { q: '¿Cuánto cuesta?', a: 'Aparecer en el mapa y recibir solicitudes es gratis. TODH no cobra comisión sobre el pago de sala (solo el coste de Stripe): la plataforma se monetiza con las inscripciones de los jugadores, no con tu alquiler.' },
  { q: '¿Quién decide el precio de la sala?', a: 'Tú. Eliges el modelo (cuota fija, por setup, por hora o % de inscripciones) al publicar tu disponibilidad, y se pacta con cada organizador en el chat de negociación.' },
  { q: '¿Cómo controlo quién entra?', a: 'Mantienes una lista de TOs de confianza que reservan directo. Los organizadores que no conoces te mandan una solicitud con fecha, nº de personas y condiciones, y tú aceptas, contraofertas o rechazas.' },
  { q: '¿Hay permanencia?', a: 'Ninguna. Es nuestra bandera: te quedas porque te sirve, no porque firmaste.' },
  { q: '¿Necesito instalar algo?', a: 'No. Tu panel funciona desde el navegador del móvil, la tablet o el ordenador. Los jugadores y organizadores usan la app de TODH.' },
]

export default function ParaLocalesPage() {
  return (
    <div className="min-h-screen bg-[#0B0B12] text-white">
      {/* Barra superior */}
      <header className="sticky top-0 z-20 glass-strong border-b border-white/8">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-black text-display text-lg tracking-tight">TODH</Link>
          <div className="flex items-center gap-2">
            <Link href="/local-panel/login" className="btn-ghost text-sm h-9">Entrar</Link>
            <Link href="/local-panel/registro" className="btn-primary text-sm h-9">Registra tu sala</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-halo-rose absolute -top-32 -right-24 w-[28rem] h-[28rem] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-16 relative">
          <p className="eyebrow mb-4">Para locales y salas de juego</p>
          <h1 className="text-display text-4xl md:text-6xl font-black tracking-tight leading-[1.05] max-w-3xl">
            Llena tu sala con torneos.
          </h1>
          <p className="text-lg md:text-xl text-[#B8B8CC] mt-5 max-w-2xl">
            TODH pone tu sala en el mapa de torneos de Madrid, te conecta con organizadores que buscan dónde
            competir y reparte tu parte automáticamente. Sin permanencia.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/local-panel/registro" className="btn-primary h-12 px-6 text-base inline-flex items-center gap-2">
              Registra tu sala gratis <ArrowRight size={18} />
            </Link>
            <Link href="/sede" className="btn-ghost h-12 px-6 text-base">Ver el panel (demo)</Link>
          </div>
          <p className="text-sm text-[#8B8BA8] mt-4">Aparecer en el mapa, gratis · Sin comisión sobre la sala · Sin permanencia</p>
        </div>
      </section>

      {/* Módulos */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">Todo lo que ganas</h2>
        <p className="text-[#B8B8CC] mt-2 max-w-2xl">Activa solo lo que uses. Lo demás, apagado hasta que lo necesites.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {MODULOS.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="card-premium p-5">
              <div className="w-11 h-11 rounded-2xl bg-[#B6FF3A]/12 flex items-center justify-center mb-3">
                <Icon size={20} className="text-[#B6FF3A]" />
              </div>
              <h3 className="font-bold text-white">{titulo}</h3>
              <p className="text-sm text-[#B8B8CC] mt-1.5 leading-relaxed">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">Cómo funciona</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {PASOS.map(({ n, titulo, texto }) => (
            <div key={n} className="relative rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <span className="text-display text-5xl font-black text-[#B6FF3A]/30">{n}</span>
              <h3 className="font-bold text-white mt-1">{titulo}</h3>
              <p className="text-sm text-[#B8B8CC] mt-1.5 leading-relaxed">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Oferta */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <div className="card-premium p-6 md:p-10 text-center">
          <p className="eyebrow mb-3">Empieza sin riesgo</p>
          <h2 className="text-display text-2xl md:text-4xl font-bold tracking-tight">Pruébalo gratis. Sin permanencia.</h2>
          <p className="text-[#B8B8CC] mt-3 max-w-xl mx-auto">
            Aparece en el mapa y recibe solicitudes de organizadores desde el primer día sin coste. TODH no
            cobra comisión sobre el alquiler de tu sala.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-sm text-[#B8B8CC]">
            <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#27AE60]" /> En el mapa de torneos, gratis</span>
            <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#27AE60]" /> Sin comisión sobre la sala</span>
            <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#27AE60]" /> Te vas cuando quieras</span>
          </div>
          <Link href="/local-panel/registro" className="btn-primary h-12 px-7 text-base inline-flex items-center gap-2 mt-8">
            Registra tu sala gratis <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">Preguntas frecuentes</h2>
        <div className="mt-6 space-y-2">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5">
              <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-white text-sm">
                {q}
                <span className="text-[#8B8BA8] group-open:rotate-45 transition-transform text-lg leading-none">+</span>
              </summary>
              <p className="text-sm text-[#B8B8CC] mt-2.5 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final + footer */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-[#B6FF3A]/15 to-[#7C5CFF]/10 border border-white/10 p-8 md:p-12 text-center">
          <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">¿Listo para llenar tu sala?</h2>
          <p className="text-[#B8B8CC] mt-2">Alta en minutos. Sin permanencia.</p>
          <Link href="/local-panel/registro" className="btn-primary h-12 px-7 text-base inline-flex items-center gap-2 mt-6">
            Registra tu sala gratis <ArrowRight size={18} />
          </Link>
        </div>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6B6B85]">
          <span>© TODH · Torneos presenciales</span>
          <div className="flex gap-4">
            <Link href="/terminos" className="hover:text-white">Términos</Link>
            <Link href="/privacidad" className="hover:text-white">Privacidad</Link>
            <Link href="/local-panel/login" className="hover:text-white">Entrar</Link>
          </div>
        </footer>
      </section>
    </div>
  )
}
