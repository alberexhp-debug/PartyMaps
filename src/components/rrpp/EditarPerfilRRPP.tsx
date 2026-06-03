'use client'
import { useState } from 'react'
import { X, AtSign } from 'lucide-react'
import { PhotoUpload } from '@/components/ui/PhotoUpload'

type RRPP = {
  id: string; slug: string; nombre_publico: string; foto_url: string | null
  bio: string | null; instagram: string | null; tiktok: string | null
}

export function EditarPerfilRRPP({ rrpp, onClose, onSaved }: {
  rrpp: RRPP; onClose: () => void; onSaved: () => void
}) {
  const [nombre, setNombre] = useState(rrpp.nombre_publico || '')
  const [slug, setSlug] = useState(rrpp.slug || '')
  const [bio, setBio] = useState(rrpp.bio || '')
  const [instagram, setInstagram] = useState(rrpp.instagram || '')
  const [tiktok, setTiktok] = useState(rrpp.tiktok || '')
  const [fotoUrl, setFotoUrl] = useState<string | null>(rrpp.foto_url)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    setGuardando(true); setError(null)
    const r = await fetch('/api/rrpp/perfil', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre_publico: nombre, slug, bio, instagram, tiktok, foto_url: fotoUrl ?? '' }),
    })
    const j = await r.json().catch(() => ({}))
    setGuardando(false)
    if (!r.ok) { setError(j.error || 'No se pudo guardar'); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white text-display">Editar perfil</h2>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex justify-center mb-5">
          <PhotoUpload bucket="perfiles" path={`${rrpp.id}/avatar`} variant="circle"
            currentUrl={fotoUrl ?? undefined} label="Foto"
            onUpload={(url) => setFotoUrl(url)} onError={(e) => setError(e)} />
        </div>

        <div className="space-y-4">
          <Campo label="Nombre público">
            <input value={nombre} onChange={e => setNombre(e.target.value)} className="inp" placeholder="Leo Noches" />
          </Campo>
          <Campo label="URL personal">
            <div className="flex items-center gap-2">
              <span className="text-[#6B6B85] text-sm shrink-0">/r/</span>
              <input value={slug} onChange={e => setSlug(e.target.value)} className="inp" placeholder="leo-noches" />
            </div>
          </Campo>
          <Campo label="Bio">
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="inp resize-none" placeholder="Llevo las mejores noches de Madrid" />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Instagram">
              <div className="relative">
                <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B85]" />
                <input value={instagram} onChange={e => setInstagram(e.target.value.replace('@', ''))} className="inp pl-8" placeholder="leo.noches" />
              </div>
            </Campo>
            <Campo label="TikTok">
              <div className="relative">
                <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B85]" />
                <input value={tiktok} onChange={e => setTiktok(e.target.value.replace('@', ''))} className="inp pl-8" placeholder="leo.noches" />
              </div>
            </Campo>
          </div>
          {error && <p className="text-rose-300 text-sm">{error}</p>}
          <button onClick={guardar} disabled={guardando || !nombre.trim()} className="btn-primary w-full">{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </div>
      <style jsx>{`
        :global(.inp){width:100%;height:2.75rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);padding:0 .9rem;color:#fff;outline:none}
        :global(textarea.inp){height:auto;padding-top:.6rem;padding-bottom:.6rem}
        :global(.inp:focus){border-color:rgba(224,69,94,.6)}
      `}</style>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#A0A0B8] mb-1.5">{label}</label>
      {children}
    </div>
  )
}
