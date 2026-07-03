'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhotoUpload } from '@/components/ui/PhotoUpload'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { calcularEdad } from '@/lib/utils'
import { PageLoader } from '@/components/ui/Spinner'
import { User, Calendar } from 'lucide-react'

/**
 * Paso final para usuarios que entran por Google y aún no tienen perfil.
 * Recoge lo mínimo legal (nombre + fecha de nacimiento +18) y crea la
 * fila en `usuarios`. La foto es opcional (si Google trae una, se prefija).
 */
export default function CompletarPerfilPage() {
  const router = useRouter()
  const toast = useToast()
  const setUsuario = useAuthStore(s => s.setUsuario)

  const [cargando, setCargando] = useState(true)
  const [authId, setAuthId] = useState<string | null>(null)
  const [proveedor, setProveedor] = useState<'ninguno' | 'google' | 'apple'>('ninguno')
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }

      // Si ya tuviera perfil, no debería estar aquí.
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle()
      if (perfil) { router.replace('/mapa'); return }

      const meta = user.user_metadata || {}
      setNombre((meta.full_name || meta.name || '').toString().slice(0, 50))
      if (meta.avatar_url || meta.picture) setFotoUrl((meta.avatar_url || meta.picture).toString())
      const prov = (user.app_metadata?.provider || '').toString()
      setProveedor(prov === 'google' ? 'google' : prov === 'apple' ? 'apple' : 'ninguno')
      setAuthId(user.id)
      setCargando(false)
    })
  }, [router])

  const finalizar = async () => {
    if (nombre.trim().length < 2) { setError('Escribe tu nombre'); return }
    if (!fechaNacimiento) { setError('Indica tu fecha de nacimiento'); return }
    if (calcularEdad(fechaNacimiento) < 18) { setError('Debes ser mayor de 18 años'); return }
    if (!aceptaTerminos) { setError('Acepta los términos para continuar'); return }
    if (!authId) return

    setError('')
    setLoading(true)
    const ref = (() => { try { return sessionStorage.getItem('rumbo_ref') } catch { return null } })()
    const { data, error: err } = await supabase
      .from('usuarios')
      .insert({
        auth_id: authId,
        nombre: nombre.trim(),
        apellidos: apellidos.trim() || null,
        fecha_nacimiento: fechaNacimiento,
        foto_perfil_url: fotoUrl || null,
        auth_provider: proveedor,
        telefono_verificado: false,
        referido_codigo: ref || null,
        referido_at: ref ? new Date().toISOString() : null,
        estado_cuenta: 'activa',
      })
      .select('*')
      .single()

    if (err || !data) {
      toast.error('No se pudo crear el perfil. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    try { sessionStorage.removeItem('rumbo_ref') } catch {}
    setUsuario(data)
    toast.success('¡Listo! Bienvenido/a a Tourneum')
    router.push('/mapa')
  }

  if (cargando) return <PageLoader />

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0D0F15] px-5 py-10">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-[#B6FF3A]/22 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-[#7C5CFF]/20 blur-[120px]" />

      <div className="card-premium w-full max-w-[26rem] rounded-3xl p-6 sm:p-8 animate-slide-up">
        <div className="mb-6">
          <p className="eyebrow mb-2">Casi estás</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-display tracking-tight">
            Completa tu perfil
          </h1>
          <p className="mt-1.5 text-[15px] text-[#A0A0B8]">Solo nos falta esto para empezar</p>
        </div>

        <div className="mb-5 flex justify-center">
          <PhotoUpload
            bucket="perfiles"
            path={authId ?? 'pendiente'}
            variant="circle"
            currentUrl={fotoUrl || undefined}
            label="Tu foto"
            onUpload={url => setFotoUrl(url)}
            onError={msg => toast.error(msg)}
          />
        </div>

        <div className="space-y-3">
          <Input
            label="Nombre"
            placeholder="Tu nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value.slice(0, 50))}
            icon={<User size={16} />}
          />
          <Input
            label="Apellidos"
            placeholder="Tus apellidos"
            value={apellidos}
            onChange={e => setApellidos(e.target.value.slice(0, 80))}
            icon={<User size={16} />}
          />
          <Input
            label="Fecha de nacimiento"
            type="date"
            value={fechaNacimiento}
            onChange={e => setFechaNacimiento(e.target.value)}
            icon={<Calendar size={16} />}
            error={error}
          />

          <label className="flex items-start gap-3 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={aceptaTerminos}
              onChange={e => setAceptaTerminos(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#B6FF3A]"
            />
            <span className="text-xs text-[#A0A0B8]">
              Acepto los{' '}
              <Link href="/terminos" className="text-[#B6FF3A] hover:underline">Términos</Link> y la{' '}
              <Link href="/privacidad" className="text-[#B6FF3A] hover:underline">Política de Privacidad</Link>.
            </span>
          </label>

          <Button fullWidth size="lg" onClick={finalizar} loading={loading}>
            Entrar a Tourneum
          </Button>
        </div>
      </div>
    </div>
  )
}
