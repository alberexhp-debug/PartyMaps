'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { ConfiguracionSistema } from '@/types'
import { Settings, Save } from 'lucide-react'
import { registrarAuditoria } from '@/lib/auditoria'

export default function ConfiguracionPage() {
  const toast = useToast()
  const [config, setConfig] = useState<ConfiguracionSistema[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase.from('configuracion_sistema').select('*').order('clave').then(({ data }) => {
      if (data) {
        setConfig(data)
        setValores(Object.fromEntries(data.map(c => [c.clave, c.valor])))
      }
      setLoading(false)
    })
  }, [])

  const guardar = async () => {
    setGuardando(true)
    const cambios: Array<{ clave: string; antes: string; despues: string }> = []
    for (const c of config) {
      const nuevoValor = valores[c.clave]
      if (nuevoValor != null && nuevoValor !== c.valor) {
        await supabase.from('configuracion_sistema')
          .update({ valor: nuevoValor, updated_at: new Date().toISOString() })
          .eq('clave', c.clave)
        cambios.push({ clave: c.clave, antes: c.valor, despues: nuevoValor })
      }
    }
    if (cambios.length > 0) {
      await registrarAuditoria({
        tipo_accion: 'configuracion_actualizada',
        entidad_tipo: 'configuracion_sistema',
        datos_anteriores: Object.fromEntries(cambios.map(c => [c.clave, c.antes])),
        datos_nuevos: Object.fromEntries(cambios.map(c => [c.clave, c.despues])),
      })
      toast.success(`${cambios.length} ${cambios.length === 1 ? 'valor actualizado' : 'valores actualizados'}`)
    } else {
      toast.info('Sin cambios')
    }
    setGuardando(false)
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-[#4F8EF7]" />
          <h1 className="text-2xl font-black text-white">Configuración del sistema</h1>
        </div>
        <Button loading={guardando} onClick={guardar} size="sm">
          <Save size={14} /> Guardar
        </Button>
      </div>

      {loading ? (
        Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-[#1A1A2E] rounded-xl animate-pulse" />)
      ) : (
        <div className="space-y-3">
          {config.map(c => (
            <div key={c.clave} className="bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] p-4 space-y-2">
              <div>
                <p className="text-sm font-bold text-white font-mono">{c.clave}</p>
                {c.descripcion && <p className="text-xs text-[#505065]">{c.descripcion}</p>}
              </div>
              <input
                value={valores[c.clave] || ''}
                onChange={e => setValores(v => ({ ...v, [c.clave]: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#4F8EF7]/50 font-mono"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
