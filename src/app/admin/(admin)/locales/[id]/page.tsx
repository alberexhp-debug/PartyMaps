'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { registrarAuditoria } from '@/lib/auditoria'
import { Local, TierLocal, EstadoLocal, TipoLocal, TipoMusica, HorarioLocal } from '@/types'
import { getLabelTipoLocal } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, Save, Store, MapPin, Clock, Image, Settings, AtSign,
  Ticket, Check, X, AlertCircle, Trash2, Plus, ChevronDown,
} from 'lucide-react'

const TIPOS_LOCAL: TipoLocal[] = ['discoteca', 'bar_copas', 'rooftop', 'sala_conciertos', 'bar_cocteleria', 'otro']
const TIPOS_MUSICA: TipoMusica[] = ['techno', 'house', 'reggaeton', 'pop', 'hip_hop', 'indie', 'electronica', 'flamenco', 'otro']
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const
const LABEL_DIA: Record<string, string> = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' }

type Tab = 'info' | 'horario' | 'imagenes' | 'config' | 'estado'

export default function AdminLocalEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const toast = useToast()
  const [local, setLocal] = useState<Local | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('info')

  // Form fields
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipoLocal, setTipoLocal] = useState<TipoLocal>('discoteca')
  const [musica, setMusica] = useState<TipoMusica[]>([])
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [latitud, setLatitud] = useState('')
  const [longitud, setLongitud] = useState('')
  const [aforoMaximo, setAforoMaximo] = useState('')
  const [radioVerificacion, setRadioVerificacion] = useState('')
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [entradasDisponibles, setEntradasDisponibles] = useState('')
  const [horario, setHorario] = useState<HorarioLocal>({})
  const [imagenes, setImagenes] = useState<string[]>([])
  const [nuevaImagen, setNuevaImagen] = useState('')
  const [tier, setTier] = useState<TierLocal>('venta')
  const [estado, setEstado] = useState<EstadoLocal>('activo')
  const [cif, setCif] = useState('')
  const [emailFacturacion, setEmailFacturacion] = useState('')

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    const { data } = await supabase.from('locales').select('*').eq('id', id).single()
    if (!data) { toast.error('Local no encontrado'); router.push('/admin/locales'); return }
    setLocal(data)
    setNombre(data.nombre)
    setDescripcion(data.descripcion || '')
    setTipoLocal(data.tipo_local)
    setMusica(data.musica || [])
    setDireccion(data.direccion)
    setCiudad(data.ciudad)
    setLatitud(String(data.latitud))
    setLongitud(String(data.longitud))
    setAforoMaximo(String(data.aforo_maximo))
    setRadioVerificacion(String(data.radio_verificacion_metros))
    setPrecioMin(data.precio_entrada_min ? String(data.precio_entrada_min) : '')
    setPrecioMax(data.precio_entrada_max ? String(data.precio_entrada_max) : '')
    setInstagramHandle(data.instagram_handle || '')
    setEntradasDisponibles(data.entradas_disponibles_noche ? String(data.entradas_disponibles_noche) : '')
    setHorario(data.horario || {})
    setImagenes(data.imagenes || [])
    setTier(data.tier)
    setEstado(data.estado)
    setCif(data.cif || '')
    setEmailFacturacion(data.email_facturacion || '')
    setLoading(false)
  }

  async function guardar() {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    const updates: Partial<Local> = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      tipo_local: tipoLocal,
      musica,
      direccion: direccion.trim(),
      ciudad: ciudad.trim(),
      latitud: parseFloat(latitud) || local!.latitud,
      longitud: parseFloat(longitud) || local!.longitud,
      aforo_maximo: parseInt(aforoMaximo) || local!.aforo_maximo,
      radio_verificacion_metros: parseInt(radioVerificacion) || local!.radio_verificacion_metros,
      precio_entrada_min: precioMin ? parseFloat(precioMin) : undefined,
      precio_entrada_max: precioMax ? parseFloat(precioMax) : undefined,
      instagram_handle: instagramHandle.trim().replace('@', '') || undefined,
      entradas_disponibles_noche: entradasDisponibles ? parseInt(entradasDisponibles) : undefined,
      horario,
      imagenes,
      tier,
      estado,
      cif: cif.trim() || undefined,
      email_facturacion: emailFacturacion.trim() || undefined,
    }
    const { error } = await supabase.from('locales').update(updates).eq('id', id)
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    await registrarAuditoria({
      tipo_accion: 'admin_edicion_local',
      entidad_tipo: 'local',
      entidad_id: id,
      datos_anteriores: { nombre: local!.nombre, estado: local!.estado, tier: local!.tier },
      datos_nuevos: { nombre: updates.nombre, estado: updates.estado, tier: updates.tier },
    })
    toast.success('Cambios guardados')
    setSaving(false)
    cargar()
  }

  const toggleMusica = (m: TipoMusica) =>
    setMusica(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const setDiaHorario = (dia: string, campo: 'apertura' | 'cierre', valor: string) => {
    setHorario(prev => ({
      ...prev,
      [dia]: { ...(prev[dia as keyof HorarioLocal] || { apertura: '', cierre: '' }), [campo]: valor },
    }))
  }

  const toggleDia = (dia: string) => {
    setHorario(prev => {
      if (prev[dia as keyof HorarioLocal]) {
        const next = { ...prev }
        delete next[dia as keyof HorarioLocal]
        return next
      }
      return { ...prev, [dia]: { apertura: '22:00', cierre: '06:00' } }
    })
  }

  const addImagen = () => {
    if (!nuevaImagen.trim()) return
    setImagenes(prev => [...prev, nuevaImagen.trim()])
    setNuevaImagen('')
  }

  const removeImagen = (i: number) => setImagenes(prev => prev.filter((_, idx) => idx !== i))

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'info', label: 'Info', icon: Store },
    { id: 'horario', label: 'Horario', icon: Clock },
    { id: 'imagenes', label: 'Imágenes', icon: Image },
    { id: 'config', label: 'Config', icon: Settings },
    { id: 'estado', label: 'Estado', icon: AlertCircle },
  ]

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!local) return null

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-[#0E0E1A]/95 backdrop-blur border-b border-white/8 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/admin/locales')}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center hover:bg-white/10 transition-colors">
            <ArrowLeft size={16} className="text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-[#E94560] uppercase tracking-[0.2em]">Editar local</p>
            <h1 className="text-base font-bold text-white truncate">{local.nombre}</h1>
          </div>
          <Button size="sm" loading={saving} onClick={guardar}>
            <Save size={14} /> Guardar
          </Button>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto mt-3 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(({ id: tId, label, icon: Icon }) => (
            <button key={tId} onClick={() => setTab(tId)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                tab === tId ? 'bg-white/10 text-white' : 'text-[#8B8BA8] hover:text-white',
              )}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* INFO */}
        {tab === 'info' && (
          <>
            <Section label="Datos básicos">
              <Field label="Nombre *">
                <Input value={nombre} onChange={setNombre} placeholder="Nombre del local" />
              </Field>
              <Field label="Descripción">
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  placeholder="Descripción del local..." rows={3} maxLength={500}
                  className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-white/20 resize-none placeholder:text-[#6B6B85]" />
              </Field>
            </Section>

            <Section label="Tipo de local">
              <div className="flex flex-wrap gap-2">
                {TIPOS_LOCAL.map(t => (
                  <button key={t} onClick={() => setTipoLocal(t)}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                      tipoLocal === t ? 'bg-[#E94560] border-[#E94560] text-white' : 'border-white/10 text-[#8B8BA8] hover:border-white/20')}>
                    {getLabelTipoLocal(t)}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="Música">
              <div className="flex flex-wrap gap-2">
                {TIPOS_MUSICA.map(m => (
                  <button key={m} onClick={() => toggleMusica(m)}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                      musica.includes(m) ? 'bg-[#4F8EF7] border-[#4F8EF7] text-white' : 'border-white/10 text-[#8B8BA8] hover:border-white/20')}>
                    {m}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="Ubicación">
              <Field label="Dirección">
                <Input value={direccion} onChange={setDireccion} placeholder="Calle y número" />
              </Field>
              <Field label="Ciudad">
                <Input value={ciudad} onChange={setCiudad} placeholder="Ciudad" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitud">
                  <Input value={latitud} onChange={setLatitud} placeholder="41.3851" />
                </Field>
                <Field label="Longitud">
                  <Input value={longitud} onChange={setLongitud} placeholder="2.1734" />
                </Field>
              </div>
            </Section>

            <Section label="Precios de entrada">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mínimo (€)">
                  <Input value={precioMin} onChange={setPrecioMin} placeholder="0" />
                </Field>
                <Field label="Máximo (€)">
                  <Input value={precioMax} onChange={setPrecioMax} placeholder="20" />
                </Field>
              </div>
            </Section>

            <Section label="Facturación">
              <Field label="CIF">
                <Input value={cif} onChange={setCif} placeholder="B12345678" />
              </Field>
              <Field label="Email de facturación">
                <Input value={emailFacturacion} onChange={setEmailFacturacion} placeholder="facturacion@local.com" />
              </Field>
            </Section>
          </>
        )}

        {/* HORARIO */}
        {tab === 'horario' && (
          <Section label="Días de apertura">
            <div className="space-y-3">
              {DIAS.map(dia => {
                const h = horario[dia as keyof HorarioLocal]
                const abierto = !!h
                return (
                  <div key={dia} className={cn('p-3 rounded-xl border transition-colors', abierto ? 'border-white/15 bg-white/4' : 'border-white/6 bg-white/2')}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleDia(dia)}
                        className={cn('w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0',
                          abierto ? 'bg-[#E94560] border-[#E94560]' : 'border-white/20')}>
                        {abierto && <Check size={11} className="text-white" />}
                      </button>
                      <span className="text-sm font-semibold text-white w-8">{LABEL_DIA[dia]}</span>
                      {abierto && h && (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" value={h.apertura}
                            onChange={e => setDiaHorario(dia, 'apertura', e.target.value)}
                            className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none" />
                          <span className="text-[#6B6B85] text-xs">→</span>
                          <input type="time" value={h.cierre}
                            onChange={e => setDiaHorario(dia, 'cierre', e.target.value)}
                            className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs outline-none" />
                        </div>
                      )}
                      {!abierto && <span className="text-xs text-[#6B6B85]">Cerrado</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* IMÁGENES */}
        {tab === 'imagenes' && (
          <Section label={`Galería (${imagenes.length})`}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {imagenes.map((url, i) => (
                <div key={i} className="relative aspect-video rounded-xl overflow-hidden bg-white/4 border border-white/8 group">
                  <img src={url} alt="" className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => removeImagen(i)}
                      className="w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center">
                      <Trash2 size={13} className="text-white" />
                    </button>
                  </div>
                  {i === 0 && (
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 bg-[#E94560] rounded-md text-white">
                      Principal
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={nuevaImagen} onChange={e => setNuevaImagen(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addImagen()}
                placeholder="URL de imagen..."
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-white/20 placeholder:text-[#6B6B85]" />
              <button onClick={addImagen}
                className="px-4 py-2.5 bg-white/8 border border-white/10 rounded-xl text-white text-sm hover:bg-white/12 transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <p className="text-xs text-[#6B6B85] mt-2">La primera imagen se usa como portada en el mapa y la app</p>
          </Section>
        )}

        {/* CONFIG */}
        {tab === 'config' && (
          <>
            <Section label="Capacidad">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Aforo máximo">
                  <Input value={aforoMaximo} onChange={setAforoMaximo} placeholder="500" />
                </Field>
                <Field label="Radio verificación (m)">
                  <Input value={radioVerificacion} onChange={setRadioVerificacion} placeholder="200" />
                </Field>
              </div>
            </Section>

            <Section label="Entradas">
              <Field label="Entradas disponibles por noche">
                <Input value={entradasDisponibles} onChange={setEntradasDisponibles} placeholder="Sin límite" />
              </Field>
              <p className="text-xs text-[#6B6B85]">
                Si se deja vacío, no hay tope. El local puede ajustar este valor desde su panel.
              </p>
            </Section>

            <Section label="Instagram">
              <Field label="Cuenta de Instagram">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B8BA8] text-sm">@</span>
                  <input value={instagramHandle} onChange={e => setInstagramHandle(e.target.value.replace('@', ''))}
                    placeholder="nombrelocal"
                    className="w-full pl-8 pr-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-white/20 placeholder:text-[#6B6B85]" />
                </div>
              </Field>
              <p className="text-xs text-[#6B6B85]">
                Se usa en los concursos para que los participantes etiqueten al local en Instagram.
              </p>
            </Section>
          </>
        )}

        {/* ESTADO */}
        {tab === 'estado' && (
          <>
            <Section label="Tier del local">
              <div className="grid grid-cols-2 gap-2">
                {(['visibility', 'venta', 'pro', 'destacado'] as TierLocal[]).map(t => (
                  <button key={t} onClick={() => setTier(t)}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-colors',
                      tier === t ? 'border-[#E94560] bg-[#E94560]/10' : 'border-white/10 hover:border-white/20',
                    )}>
                    <p className={cn('text-sm font-bold capitalize', tier === t ? 'text-[#E94560]' : 'text-white')}>{t}</p>
                    <p className="text-[11px] text-[#6B6B85] mt-0.5">
                      {t === 'visibility' ? 'Gratis, sin venta' :
                       t === 'venta' ? 'Gratis, comisión 4%' :
                       t === 'pro' ? '49€/mes, comisión 2.5%' :
                       'Destacado 149€/mes'}
                    </p>
                  </button>
                ))}
              </div>
            </Section>

            <Section label="Estado">
              <div className="space-y-2">
                {([
                  { v: 'activo', label: 'Activo', desc: 'Visible y operativo en la app', color: '#27AE60' },
                  { v: 'pendiente_verificacion', label: 'Pendiente', desc: 'Esperando verificación', color: '#F39C12' },
                  { v: 'suspendido', label: 'Suspendido', desc: 'No visible para usuarios', color: '#E94560' },
                ] as const).map(({ v, label, desc, color }) => (
                  <button key={v} onClick={() => setEstado(v)}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors',
                      estado === v ? 'border-white/25 bg-white/6' : 'border-white/8 hover:border-white/15',
                    )}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-xs text-[#6B6B85]">{desc}</p>
                    </div>
                    {estado === v && <Check size={14} className="text-white shrink-0" />}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="Información del sistema">
              <div className="space-y-2 text-sm text-[#8B8BA8]">
                <div className="flex justify-between">
                  <span>ID</span>
                  <span className="text-white font-mono text-xs">{local.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Creado</span>
                  <span className="text-white">{new Date(local.created_at).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Suscriptores</span>
                  <span className="text-white">{local.num_suscriptores}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stripe</span>
                  <span className={cn('text-xs', local.stripe_account_id ? 'text-green-400' : 'text-[#6B6B85]')}>
                    {local.stripe_account_id ? 'Conectado' : 'Sin conectar'}
                  </span>
                </div>
              </div>
            </Section>
          </>
        )}

        {/* Guardar flotante mobile */}
        <div className="fixed bottom-6 left-4 right-4 md:hidden">
          <Button fullWidth loading={saving} onClick={guardar}>
            <Save size={16} /> Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/3 border border-white/6 rounded-2xl p-4 space-y-4">
      <p className="text-xs font-bold text-[#8B8BA8] uppercase tracking-[0.15em]">{label}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[#A0A0B8]">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-white/20 placeholder:text-[#6B6B85]" />
  )
}
