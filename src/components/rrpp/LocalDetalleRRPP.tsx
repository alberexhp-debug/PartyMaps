'use client'
import { useEffect, useState } from 'react'
import { X, MessageCircle, MapPin, Users, Ticket, Calendar, Beer, Percent, Sparkles } from 'lucide-react'
import { ChatRrpp } from '@/components/chat/ChatRrpp'
import { CodigosLocal } from '@/components/rrpp/CodigosLocal'
import { LABEL_CATEGORIA, CATEGORIAS_DESCUENTO, type CategoriaDescuento } from '@/lib/rrppCodigos'

type Detalle = {
  local: { id: string; nombre: string; descripcion?: string; tipo_local: string; ciudad: string; foto_url: string | null; aforo_maximo: number; precio_entrada_min?: number; instagram_handle?: string; num_suscriptores: number }
  relacion: { estado: string; comision_pct: number; tope_por_venta: number | null; descuentos: Record<string, number> }
  noche: { eventos: { id: string; nombre: string; fecha_inicio: string; imagen_url?: string }[]; productos: { id: string; nombre: string; categoria: string; precio: number }[]; aforo_maximo: number; promo_activa: boolean; precio_promocional: number | null }
  mi_rendimiento: { entradas: number; entradas_eur: number; consumiciones: number; consumiciones_eur: number; comision_generada: number }
  interlocutor: { tipo: 'local' | 'manager'; nombre: string }
}

export function LocalDetalleRRPP({ localId, onClose }: { localId: string; onClose: () => void }) {
  const [d, setD] = useState<Detalle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chat, setChat] = useState(false)

  useEffect(() => {
    fetch(`/api/rrpp/local/${localId}`).then(r => r.ok ? r.json() : r.json().then(j => Promise.reject(j)))
      .then(setD).catch(j => setError(j?.error || 'No se pudo cargar'))
  }, [localId])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl glass-strong border border-white/10 animate-slide-up" onClick={e => e.stopPropagation()}>
        {!d ? (
          <div className="p-8 text-center text-[#8B8BA8]">{error || 'Cargando…'}
            <button onClick={onClose} className="block mx-auto mt-4 text-sm text-white underline">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="relative h-32">
              {d.local.foto_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={d.local.foto_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full holo-bg opacity-60" />}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E1A] to-transparent" />
              <button onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><X size={16} /></button>
              <div className="absolute bottom-2.5 left-4 right-4">
                <h2 className="text-display text-xl font-bold text-white truncate">{d.local.nombre}</h2>
                <p className="text-[#B8B8CC] text-xs flex items-center gap-1"><MapPin size={11} /> {d.local.ciudad}</p>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Tu acuerdo */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5">
                <p className="eyebrow eyebrow-rose mb-2">Tu acuerdo</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-[#B8B8CC] flex items-center gap-1"><Percent size={13} className="text-[#B6FF3A]" /> Comisión <b className="text-white">{d.relacion.comision_pct}%</b></span>
                  {d.relacion.tope_por_venta != null && <span className="text-[#8B8BA8] text-xs">tope {d.relacion.tope_por_venta}€</span>}
                </div>
                {CATEGORIAS_DESCUENTO.some(c => (d.relacion.descuentos?.[c] ?? 0) > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(CATEGORIAS_DESCUENTO as CategoriaDescuento[]).map(c => (d.relacion.descuentos?.[c] ?? 0) > 0 && (
                      <span key={c} className="text-[11px] font-semibold text-[#B6FF3A] bg-[#B6FF3A]/10 rounded-full px-2 py-0.5">{LABEL_CATEGORIA[c]} −{d.relacion.descuentos[c]}%</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tu rendimiento con este local */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5">
                <p className="eyebrow eyebrow-rose mb-2.5">Tu rendimiento aquí</p>
                <div className="grid grid-cols-3 gap-2">
                  <Mini icon={Ticket} label="Entradas" valor={d.mi_rendimiento.entradas} />
                  <Mini icon={Beer} label="Consumiciones" valor={d.mi_rendimiento.consumiciones} />
                  <Mini icon={Percent} label="Tu comisión" valor={`${(d.mi_rendimiento.comision_generada || 0).toFixed(0)}€`} />
                </div>
                <p className="text-[11px] text-[#6B6B85] mt-2">
                  Entradas y consumiciones atribuidas a ti en este local (por tu código o link).
                </p>
              </div>

              {/* Generador de códigos QR por persona para este local */}
              <CodigosLocal localId={localId} descuentos={d.relacion.descuentos} />

              {/* Chat con manager/local */}
              <button onClick={() => setChat(true)}
                className="w-full flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5 hover:bg-white/[0.06] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#4F8EF7]/15 flex items-center justify-center text-[#4F8EF7]"><MessageCircle size={18} /></div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">Chat con {d.interlocutor.tipo === 'manager' ? 'el manager' : 'el local'}</p>
                  <p className="text-xs text-[#8B8BA8]">{d.interlocutor.nombre}</p>
                </div>
              </button>

              {/* Métricas rápidas */}
              <div className="grid grid-cols-3 gap-2">
                <Mini icon={Users} label="Suscriptores" valor={d.local.num_suscriptores} />
                <Mini icon={Ticket} label="Entrada" valor={d.local.precio_entrada_min ? `${d.local.precio_entrada_min}€` : 'Gratis'} />
                <Mini icon={Sparkles} label="Aforo máx" valor={d.noche.aforo_maximo} />
              </div>

              {/* Datos de la noche: eventos */}
              <div>
                <p className="eyebrow eyebrow-rose mb-2 flex items-center gap-1.5"><Calendar size={12} /> Próximas noches</p>
                {d.noche.eventos.length === 0 ? (
                  <p className="text-xs text-[#6B6B85]">El local no tiene eventos publicados ahora mismo.</p>
                ) : (
                  <div className="space-y-1.5">
                    {d.noche.eventos.map(e => (
                      <div key={e.id} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5">
                        <div className="w-9 h-9 rounded-lg bg-white/5 overflow-hidden shrink-0">
                          {e.imagen_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={e.imagen_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Calendar size={14} className="text-[#6B6B85]" /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white truncate">{e.nombre}</p>
                          <p className="text-[11px] text-[#8B8BA8]">{new Date(e.fecha_inicio).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Carta */}
              {d.noche.productos.length > 0 && (
                <div>
                  <p className="eyebrow eyebrow-rose mb-2 flex items-center gap-1.5"><Beer size={12} /> Carta ({d.noche.productos.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {d.noche.productos.slice(0, 12).map(p => (
                      <span key={p.id} className="text-[11px] text-[#B8B8CC] bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1">
                        {p.nombre} · {p.precio}€
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {d.local.descripcion && <p className="text-sm text-[#A0A0B8]">{d.local.descripcion}</p>}
            </div>
          </>
        )}
      </div>

      {chat && d && (
        <ChatRrpp
          titulo={d.interlocutor.nombre}
          subtitulo={d.interlocutor.tipo === 'manager' ? 'Manager del local' : 'Local'}
          getUrl={`/api/rrpp/chat?local_id=${localId}`}
          postUrl="/api/rrpp/chat"
          postBody={{ local_id: localId }}
          yo="rrpp"
          onClose={() => setChat(false)}
        />
      )}
    </div>
  )
}

function Mini({ icon: Icon, label, valor }: { icon: React.ElementType; label: string; valor: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
      <Icon size={14} className="mx-auto text-[#8B8BA8] mb-1" />
      <p className="text-sm font-bold text-white text-numeric">{valor}</p>
      <p className="text-[10px] text-[#6B6B85]">{label}</p>
    </div>
  )
}
