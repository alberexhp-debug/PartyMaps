// Helper cliente para registrar acciones en el log de auditoría del admin (Doc5 §3.2).
// El endpoint verifica los permisos; aquí solo hacemos la llamada y silenciamos errores
// porque la falta de log no debe bloquear la acción principal del usuario.

export interface RegistroAuditoria {
  tipo_accion: string
  entidad_tipo?: string
  entidad_id?: string
  datos_anteriores?: unknown
  datos_nuevos?: unknown
  motivo?: string
}

export async function registrarAuditoria(r: RegistroAuditoria): Promise<void> {
  try {
    await fetch('/api/admin/auditoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(r),
    })
  } catch {
    // log opcional, no propagamos el error
  }
}
