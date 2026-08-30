'use client'
import Link from 'next/link'
import { MapPin, Handshake, Monitor, Wallet, Star, ShieldCheck, ArrowRight, Check } from 'lucide-react'
import { useT, type ClaveI18n, type Idioma } from '@/lib/i18n'
import { useDemoStore } from '@/lib/stores/useDemoStore'

// Contenido CLIENTE de /para-locales (i18n ronda 2): la página server conserva
// solo la metadata (SEO en ES) y delega aquí todo lo visible, que se traduce
// con useT como el resto de la app. Al ser una landing pública (sin sesión),
// lleva su propio selector de idioma en la cabecera; el elegido persiste en el
// store de demo y acompaña al visitante si luego entra en la app.

const MODULOS: { icon: typeof MapPin; titulo: ClaveI18n; texto: ClaveI18n }[] = [
  { icon: MapPin, titulo: 'pl.mod1T', texto: 'pl.mod1X' },
  { icon: Handshake, titulo: 'pl.mod2T', texto: 'pl.mod2X' },
  { icon: Monitor, titulo: 'pl.mod3T', texto: 'pl.mod3X' },
  { icon: Wallet, titulo: 'pl.mod4T', texto: 'pl.mod4X' },
  { icon: Star, titulo: 'pl.mod5T', texto: 'pl.mod5X' },
  { icon: ShieldCheck, titulo: 'pl.mod6T', texto: 'pl.mod6X' },
]

const PASOS: { n: number; titulo: ClaveI18n; texto: ClaveI18n }[] = [
  { n: 1, titulo: 'pl.paso1T', texto: 'pl.paso1X' },
  { n: 2, titulo: 'pl.paso2T', texto: 'pl.paso2X' },
  { n: 3, titulo: 'pl.paso3T', texto: 'pl.paso3X' },
]

const FAQ: { q: ClaveI18n; a: ClaveI18n }[] = [
  { q: 'pl.faq1Q', a: 'pl.faq1A' },
  { q: 'pl.faq2Q', a: 'pl.faq2A' },
  { q: 'pl.faq3Q', a: 'pl.faq3A' },
  { q: 'pl.faq4Q', a: 'pl.faq4A' },
  { q: 'pl.faq5Q', a: 'pl.faq5A' },
]

const IDIOMAS: { id: Idioma; label: string }[] = [
  { id: 'es', label: 'ES' },
  { id: 'en', label: 'EN' },
  { id: 'ja', label: '日本語' },
]

export function ParaLocalesContenido() {
  const { t: tr, idioma } = useT()
  const setIdioma = useDemoStore(s => s.setIdioma)

  return (
    <div className="min-h-screen bg-[#0E1118] text-white">
      {/* Barra superior */}
      <header className="sticky top-0 z-20 glass-strong border-b border-white/8">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-black text-display text-lg tracking-tight">Torneum</Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 mr-1" role="group" aria-label="Idioma">
              {IDIOMAS.map(({ id, label }) => (
                <button key={id} onClick={() => setIdioma(id)}
                  className={`px-2 h-8 rounded-lg text-[11px] font-bold transition-colors ${idioma === id ? 'bg-white/10 text-white' : 'text-[#8B8BA8] hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>
            <Link href="/login" className="btn-ghost text-sm h-9">{tr('pl.entrar')}</Link>
            <Link href="/alta-local" className="btn-primary text-sm h-9">{tr('pl.registraSala')}</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-halo-rose absolute -top-32 -right-24 w-[28rem] h-[28rem] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-16 relative">
          <p className="eyebrow mb-4">{tr('pl.eyebrow')}</p>
          <h1 className="text-display text-4xl md:text-6xl font-black tracking-tight leading-[1.05] max-w-3xl">
            {tr('pl.h1')}
          </h1>
          <p className="text-lg md:text-xl text-[#B8B8CC] mt-5 max-w-2xl">
            {tr('pl.heroSub')}
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/alta-local" className="btn-primary h-12 px-6 text-base inline-flex items-center gap-2">
              {tr('pl.registraGratis')} <ArrowRight size={18} />
            </Link>
            <Link href="/sede" className="btn-ghost h-12 px-6 text-base">{tr('pl.verPanel')}</Link>
          </div>
          <p className="text-sm text-[#8B8BA8] mt-4">{tr('pl.heroNota')}</p>
        </div>
      </section>

      {/* Módulos */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">{tr('pl.modulosTitulo')}</h2>
        <p className="text-[#B8B8CC] mt-2 max-w-2xl">{tr('pl.modulosSub')}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {MODULOS.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="card-premium p-5">
              <div className="w-11 h-11 rounded-2xl bg-[#B6FF3A]/12 flex items-center justify-center mb-3">
                <Icon size={20} className="text-[#B6FF3A]" />
              </div>
              <h3 className="font-bold text-white">{tr(titulo)}</h3>
              <p className="text-sm text-[#B8B8CC] mt-1.5 leading-relaxed">{tr(texto)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">{tr('pl.comoTitulo')}</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {PASOS.map(({ n, titulo, texto }) => (
            <div key={n} className="relative rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <span className="text-display text-5xl font-black text-[#B6FF3A]/30">{n}</span>
              <h3 className="font-bold text-white mt-1">{tr(titulo)}</h3>
              <p className="text-sm text-[#B8B8CC] mt-1.5 leading-relaxed">{tr(texto)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Oferta */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <div className="card-premium p-6 md:p-10 text-center">
          <p className="eyebrow mb-3">{tr('pl.ofertaEyebrow')}</p>
          <h2 className="text-display text-2xl md:text-4xl font-bold tracking-tight">{tr('pl.ofertaTitulo')}</h2>
          <p className="text-[#B8B8CC] mt-3 max-w-xl mx-auto">
            {tr('pl.ofertaTexto')}
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-sm text-[#B8B8CC]">
            <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#27AE60]" /> {tr('pl.check1')}</span>
            <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#27AE60]" /> {tr('pl.check2')}</span>
            <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#27AE60]" /> {tr('pl.check3')}</span>
          </div>
          <Link href="/alta-local" className="btn-primary h-12 px-7 text-base inline-flex items-center gap-2 mt-8">
            {tr('pl.registraGratis')} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">{tr('pl.faqTitulo')}</h2>
        <div className="mt-6 space-y-2">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5">
              <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-white text-sm">
                {tr(q)}
                <span className="text-[#8B8BA8] group-open:rotate-45 transition-transform text-lg leading-none">+</span>
              </summary>
              <p className="text-sm text-[#B8B8CC] mt-2.5 leading-relaxed">{tr(a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final + footer */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-[#B6FF3A]/15 to-[#7C5CFF]/10 border border-white/10 p-8 md:p-12 text-center">
          <h2 className="text-display text-2xl md:text-3xl font-bold tracking-tight">{tr('pl.finalTitulo')}</h2>
          <p className="text-[#B8B8CC] mt-2">{tr('pl.finalSub')}</p>
          <Link href="/alta-local" className="btn-primary h-12 px-7 text-base inline-flex items-center gap-2 mt-6">
            {tr('pl.registraGratis')} <ArrowRight size={18} />
          </Link>
        </div>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6B6B85]">
          <span>{tr('pl.footer')}</span>
          <div className="flex gap-4">
            <Link href="/terminos" className="hover:text-white">{tr('pl.terminos')}</Link>
            <Link href="/privacidad" className="hover:text-white">{tr('pl.privacidad')}</Link>
            <Link href="/login" className="hover:text-white">{tr('pl.entrar')}</Link>
          </div>
        </footer>
      </section>
    </div>
  )
}
