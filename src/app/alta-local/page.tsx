'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useT, type ClaveI18n } from '@/lib/i18n'
import { ArrowLeft, Check, Store } from '@/components/todh/iconosTorneum'
import { FileText } from 'lucide-react'

// Alta self-service de una SEDE: el local rellena su expediente (contacto,
// fiscal, espacio, documentación) y el admin lo resuelve en Verificación.
// Cierra el callejón sin salida de /para-locales → /local-panel/registro
// («En obras»): ahora el camino existe de punta a punta.

// El id (en español) es lo que se guarda en el expediente; la clave solo pinta
// la etiqueta en el idioma activo.
const DOCS: { id: string; clave: ClaveI18n }[] = [
  { id: 'Licencia de actividad', clave: 'alta.docLicencia' },
  { id: 'Seguro RC', clave: 'alta.docSeguro' },
  { id: 'Titularidad del local', clave: 'alta.docTitularidad' },
]

export default function AltaLocalPage() {
  const { t: tr } = useT()
  const crearExpediente = useDemoStore(s => s.crearExpedienteSede)
  const [nombre, setNombre] = useState('')
  const [zona, setZona] = useState('')
  const [direccion, setDireccion] = useState('')
  const [representante, setRepresentante] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [cif, setCif] = useState('')
  const [aforo, setAforo] = useState(60)
  const [setups, setSetups] = useState(10)
  const [docs, setDocs] = useState<string[]>([])
  const [enviado, setEnviado] = useState(false)

  const completo = nombre.trim().length >= 2 && representante.trim().length >= 2
    && email.includes('@') && cif.trim().length >= 5 && direccion.trim().length >= 5 && docs.length > 0

  const enviar = () => {
    if (!completo) return
    crearExpediente({
      nombre: nombre.trim(), zona: zona.trim() || 'Madrid', representante: representante.trim(),
      email: email.trim(), telefono: telefono.trim() || '—', cif: cif.trim(), direccion: direccion.trim(),
      aforo, setups, docs,
    })
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#0D0F15]">
        <div className="max-w-sm w-full">
          <div className="h-16 w-16 mx-auto rounded-full bg-[#B6FF3A]/15 border border-[#B6FF3A]/40 flex items-center justify-center animate-pop"><Check size={30} className="text-[#B6FF3A]" /></div>
          <h1 className="mt-4 text-2xl font-bold text-white text-display">{tr('alta.enviadoTitulo')}</h1>
          <p className="mt-2 text-sm text-[#B8B8CC] leading-relaxed">{tr('alta.enviadoTextoA')} «{nombre.trim()}» {tr('alta.enviadoTextoB')}</p>
          <Link href="/para-locales" className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#8B8BA8] font-semibold hover:text-white transition-colors">
            <ArrowLeft size={14} /> {tr('alta.volver')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0F15] pb-16">
      <div className="max-w-lg mx-auto px-5 pt-8">
        <Link href="/para-locales" className="inline-flex items-center gap-1.5 text-sm text-[#8B8BA8] font-semibold hover:text-white transition-colors"><ArrowLeft size={14} /> {tr('alta.paraLocales')}</Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B6FF3A]/15 text-[#B6FF3A]"><Store size={22} /></span>
          <div>
            <h1 className="text-2xl font-bold text-white text-display">{tr('alta.titulo')}</h1>
            <p className="text-[12px] text-[#8B8BA8]">{tr('alta.sub')}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Campo label={tr('alta.nombreLocal')}><Input value={nombre} onChange={setNombre} placeholder={tr('alta.nombrePh')} /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label={tr('alta.zona')}><Input value={zona} onChange={setZona} placeholder={tr('alta.zonaPh')} /></Campo>
            <Campo label={tr('alta.cif')}><Input value={cif} onChange={setCif} placeholder="B-12345678" /></Campo>
          </div>
          <Campo label={tr('alta.direccion')}><Input value={direccion} onChange={setDireccion} placeholder={tr('alta.direccionPh')} /></Campo>
          <Campo label={tr('alta.representante')}><Input value={representante} onChange={setRepresentante} placeholder={tr('alta.representantePh')} /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label={tr('alta.correo')}><Input value={email} onChange={setEmail} placeholder={tr('alta.correoPh')} type="email" /></Campo>
            <Campo label={tr('alta.telefono')}><Input value={telefono} onChange={setTelefono} placeholder="+34 …" /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label={tr('alta.aforo')}>
              <Paso valor={aforo} onMenos={() => setAforo(v => Math.max(10, v - 10))} onMas={() => setAforo(v => v + 10)} />
            </Campo>
            <Campo label={tr('alta.setups')}>
              <Paso valor={setups} onMenos={() => setSetups(v => Math.max(1, v - 1))} onMas={() => setSetups(v => v + 1)} />
            </Campo>
          </div>
          <Campo label={tr('alta.docsLabel')}>
            <div className="space-y-1.5">
              {DOCS.map(d => {
                const on = docs.includes(d.id)
                return (
                  <button key={d.id} onClick={() => setDocs(prev => on ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                    className={`w-full h-11 px-3.5 rounded-xl border text-sm font-semibold flex items-center gap-2.5 transition-all ${on ? 'bg-[#B6FF3A]/12 text-white border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>
                    <FileText size={14} className={on ? 'text-[#B6FF3A]' : 'text-[#8B8BA8]'} /> {tr(d.clave)}
                    {on && <Check size={14} className="ml-auto text-[#B6FF3A]" />}
                  </button>
                )
              })}
            </div>
          </Campo>
          <button onClick={enviar} disabled={!completo}
            className="w-full h-13 py-3.5 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] disabled:opacity-40">
            {tr('alta.enviarExp')}
          </button>
          <p className="text-[11px] text-[#8B8BA8] text-center">{tr('alta.nota')}</p>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold text-[#B8B8CC]">{label}</label>
      {children}
    </div>
  )
}
function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
      className="w-full h-12 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/60 outline-none transition-colors" />
  )
}
function Paso({ valor, onMenos, onMas }: { valor: number; onMenos: () => void; onMas: () => void }) {
  return (
    <div className="flex items-center w-full h-12 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <button onClick={onMenos} className="h-full px-3.5 text-lg font-bold text-[#B8B8CC] hover:text-white">−</button>
      <span className="flex-1 text-center text-white font-bold font-mono-num">{valor}</span>
      <button onClick={onMas} className="h-full px-3.5 text-lg font-bold text-[#B8B8CC] hover:text-white">+</button>
    </div>
  )
}
