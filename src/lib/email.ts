/**
 * Cliente Resend con activación condicional.
 * Si RESEND_API_KEY no está definido, las funciones loguean y retornan
 * { skipped: true } sin romper el flujo. Permite desplegar antes de comprar dominio.
 */

interface EnviarOptions {
  to: string
  subject: string
  html: string
  /** Tag opcional para tracking en el dashboard de Resend */
  tag?: string
}

interface EnviarResult {
  ok: boolean
  skipped?: boolean
  id?: string
  error?: string
}

const FROM = process.env.RESEND_FROM || 'TODH <noreply@partymaps.es>'
const REPLY_TO = process.env.RESEND_REPLY_TO || 'soporte@partymaps.es'

export async function enviarEmail({ to, subject, html, tag }: EnviarOptions): Promise<EnviarResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log(`[email] skipped (no RESEND_API_KEY): "${subject}" → ${to}`)
    return { ok: true, skipped: true }
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: envolverPlantilla(html),
      replyTo: REPLY_TO,
      tags: tag ? [{ name: 'tipo', value: tag }] : undefined,
    })
    if (error) {
      console.error('[email] resend error', error)
      return { ok: false, error: error.message }
    }
    return { ok: true, id: data?.id }
  } catch (e) {
    console.error('[email] exception', e)
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}

/** Layout HTML común — header/footer TODH. Mantener inline-style por compatibilidad email. */
function envolverPlantilla(contenido: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#08080F;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;color:#FAFAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#08080F;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#14142A;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
        <tr><td style="padding:28px 28px 0 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#B6FF3A,#7C5CFF,#4F8EF7);text-align:center;vertical-align:middle;color:#fff;font-weight:900;font-size:14px;line-height:40px;">R</td>
              <td style="padding-left:12px;color:#FAFAFC;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;font-size:13px;">TODH</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 28px 28px 28px;color:#FAFAFC;line-height:1.6;font-size:15px;">
          ${contenido}
        </td></tr>
        <tr><td style="padding:0 28px 28px 28px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:18px 0 0 0;color:#6B6B85;font-size:11px;line-height:1.5;">
            Recibes este email porque tienes una cuenta en TODH.<br />
            ¿Dudas? Escribe a <a href="mailto:${REPLY_TO}" style="color:#B6FF3A;text-decoration:none;">${REPLY_TO}</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// ────────────────────────────────────────────────────────────────────
// Plantillas
// ────────────────────────────────────────────────────────────────────

interface DatosEntrada {
  nombreUsuario: string
  nombreLocal: string
  fechaEvento?: string
  precio: number
  qrUrl?: string
  entradaId: string
}

export async function emailConfirmacionEntrada(to: string, d: DatosEntrada) {
  const fecha = d.fechaEvento ? new Date(d.fechaEvento).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }) : 'A confirmar'
  return enviarEmail({
    to,
    tag: 'confirmacion_entrada',
    subject: `Tu entrada para ${d.nombreLocal}`,
    html: `
      <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;letter-spacing:-0.02em;">¡Listo, ${d.nombreUsuario}!</h1>
      <p style="margin:0 0 16px 0;color:#A0A0B8;">Tu entrada para <strong style="color:#fff;">${d.nombreLocal}</strong> está confirmada.</p>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin:20px 0;">
        <p style="margin:0;color:#6B6B85;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;">Cuándo</p>
        <p style="margin:4px 0 14px 0;font-weight:600;">${fecha}</p>
        <p style="margin:0;color:#6B6B85;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;">Total pagado</p>
        <p style="margin:4px 0 0 0;font-weight:600;color:#B6FF3A;">${d.precio.toFixed(2)} €</p>
      </div>
      <p style="margin:0 0 12px 0;">Enseña el QR en la puerta. Lo tienes en la app, en <strong>Entradas</strong>.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://partymaps.es'}/entradas/${d.entradaId}" style="display:inline-block;padding:12px 24px;background:#B6FF3A;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;">Ver mi entrada</a>
    `,
  })
}

export async function emailRecordatorioEvento(to: string, d: { nombreUsuario: string; nombreLocal: string; fechaEvento: string }) {
  const fecha = new Date(d.fechaEvento).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
  return enviarEmail({
    to,
    tag: 'recordatorio_evento',
    subject: `Esta noche en ${d.nombreLocal} 🎉`,
    html: `
      <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;letter-spacing:-0.02em;">${d.nombreUsuario}, esta noche</h1>
      <p style="margin:0 0 16px 0;color:#A0A0B8;">Pasas por <strong style="color:#fff;">${d.nombreLocal}</strong> hoy.</p>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin:20px 0;">
        <p style="margin:0;color:#6B6B85;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;">Hora</p>
        <p style="margin:4px 0 0 0;font-weight:600;font-size:18px;">${fecha}</p>
      </div>
      <p style="margin:0 0 8px 0;">Te recordamos que tienes la entrada en la app. Y un consejo: revisa el aforo antes de salir, lo actualizamos cada poco.</p>
    `,
  })
}

export async function emailReembolso(to: string, d: { nombreUsuario: string; nombreLocal: string; importe: number; motivo?: string }) {
  return enviarEmail({
    to,
    tag: 'reembolso',
    subject: `Reembolso procesado · ${d.nombreLocal}`,
    html: `
      <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;letter-spacing:-0.02em;">Reembolso emitido</h1>
      <p style="margin:0 0 16px 0;color:#A0A0B8;">Hemos procesado el reembolso de tu entrada para <strong style="color:#fff;">${d.nombreLocal}</strong>.</p>
      <div style="background:rgba(39,174,96,0.08);border:1px solid rgba(39,174,96,0.25);border-radius:16px;padding:20px;margin:20px 0;">
        <p style="margin:0;color:#27AE60;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;">Importe devuelto</p>
        <p style="margin:4px 0 0 0;font-weight:700;font-size:20px;color:#27AE60;">${d.importe.toFixed(2)} €</p>
      </div>
      ${d.motivo ? `<p style="margin:0 0 12px 0;color:#A0A0B8;font-size:13px;">Motivo: ${d.motivo}</p>` : ''}
      <p style="margin:0;color:#6B6B85;font-size:13px;">El dinero puede tardar 3-5 días laborables en aparecer en tu cuenta dependiendo del banco.</p>
    `,
  })
}

export async function emailBienvenidaTrabajador(to: string, d: { nombre: string; nombreLocal: string; rol: string; passwordTemporal: string }) {
  return enviarEmail({
    to,
    tag: 'alta_trabajador',
    subject: `Acceso al panel de ${d.nombreLocal}`,
    html: `
      <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;letter-spacing:-0.02em;">Hola ${d.nombre}</h1>
      <p style="margin:0 0 16px 0;color:#A0A0B8;">Tienes un nuevo acceso al panel de <strong style="color:#fff;">${d.nombreLocal}</strong> con el rol <strong style="color:#fff;">${d.rol}</strong>.</p>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin:20px 0;">
        <p style="margin:0;color:#6B6B85;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;">Email</p>
        <p style="margin:4px 0 14px 0;font-weight:600;">${to}</p>
        <p style="margin:0;color:#6B6B85;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;">Contraseña temporal</p>
        <p style="margin:4px 0 0 0;font-weight:600;font-family:monospace;background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:8px;display:inline-block;">${d.passwordTemporal}</p>
      </div>
      <p style="margin:0 0 16px 0;color:#F39C12;font-size:13px;">⚠️ Cambia esta contraseña cuanto antes desde tu perfil.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://partymaps.es'}/local-panel/login" style="display:inline-block;padding:12px 24px;background:#B6FF3A;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;">Acceder al panel</a>
    `,
  })
}
