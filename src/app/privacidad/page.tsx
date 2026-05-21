import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#0D0D1A]">
      <div className="px-5 pt-12 pb-20 max-w-2xl mx-auto">
        <Link href="/registro" className="inline-flex items-center gap-2 text-[#A0A0B8] mb-8 hover:text-white transition-colors">
          <ChevronLeft size={18} /> Volver
        </Link>

        <h1 className="text-2xl font-bold text-white mb-2">Política de privacidad</h1>
        <p className="text-sm text-[#505065] mb-8">Última actualización: mayo 2026</p>

        <div className="space-y-8 text-sm text-[#A0A0B8] leading-relaxed">
          <Section title="1. Responsable del tratamiento">
            PartyMaps es responsable del tratamiento de tus datos personales. Contacto: <span className="text-[#E94560]">privacidad@partymaps.com</span>
          </Section>

          <Section title="2. Datos que recogemos">
            Recogemos los datos que tú nos proporcionas al registrarte (número de teléfono, nombre, fecha de nacimiento, foto de perfil opcional), datos de uso de la app (locales visitados, entradas compradas, planes), y datos de ubicación cuando activas el permiso para centrar el mapa.
          </Section>

          <Section title="3. Finalidad del tratamiento">
            Usamos tus datos para: gestionar tu cuenta y autenticación, procesar compras de entradas, mostrarte contenido relevante en el mapa, enviarte notificaciones de locales que sigues (si lo consientes), y mejorar la plataforma mediante análisis agregados y anónimos.
          </Section>

          <Section title="4. Base legal">
            El tratamiento se basa en la ejecución del contrato (uso de la plataforma) y, para notificaciones y análisis, en tu consentimiento explícito que puedes retirar en cualquier momento desde tu perfil.
          </Section>

          <Section title="5. Conservación de datos">
            Tus datos se conservan mientras mantengas tu cuenta activa. Si eliminas tu cuenta, los datos se borran en un plazo máximo de 30 días, salvo obligación legal de conservación (p.ej., datos de facturación durante 5 años).
          </Section>

          <Section title="6. Tus derechos">
            Tienes derecho de acceso, rectificación, supresión, portabilidad y limitación del tratamiento. Ejércelos en <span className="text-[#E94560]">privacidad@partymaps.com</span> o directamente desde la sección Perfil de la app.
          </Section>

          <Section title="7. Terceros">
            PartyMaps usa Supabase (base de datos, autenticación), Mapbox (mapas) y Stripe (pagos). Cada servicio tiene su propia política de privacidad. No vendemos tus datos a terceros.
          </Section>

          <Section title="8. Cookies">
            La app usa almacenamiento local del dispositivo para mantener tu sesión. No usamos cookies de seguimiento publicitario.
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
      <p>{children}</p>
    </div>
  )
}
