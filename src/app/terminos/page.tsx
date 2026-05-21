import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#0D0D1A]">
      <div className="px-5 pt-12 pb-20 max-w-2xl mx-auto">
        <Link href="/registro" className="inline-flex items-center gap-2 text-[#A0A0B8] mb-8 hover:text-white transition-colors">
          <ChevronLeft size={18} /> Volver
        </Link>

        <h1 className="text-2xl font-bold text-white mb-2">Términos de uso</h1>
        <p className="text-sm text-[#505065] mb-8">Última actualización: mayo 2026</p>

        <div className="space-y-8 text-sm text-[#A0A0B8] leading-relaxed">
          <Section title="1. Aceptación de los términos">
            Al crear una cuenta en PartyMaps y usar la plataforma, aceptas estos Términos de Uso. Si no estás de acuerdo, no debes usar el servicio. PartyMaps está destinado exclusivamente a personas mayores de 18 años.
          </Section>

          <Section title="2. Registro y cuenta">
            Para acceder a las funcionalidades completas debes registrarte con un número de teléfono válido. Eres responsable de mantener la seguridad de tu cuenta y de toda la actividad que ocurra en ella. PartyMaps no se responsabiliza del uso no autorizado de tu cuenta.
          </Section>

          <Section title="3. Uso permitido">
            Puedes usar PartyMaps para descubrir locales de ocio nocturno, comprar entradas, organizar planes con otros usuarios y participar en experiencias dentro de los locales. Queda prohibido el uso fraudulento, la reventa no autorizada de entradas, o cualquier actividad ilegal.
          </Section>

          <Section title="4. Entradas y pagos">
            Las entradas compradas a través de PartyMaps son nominales y no transferibles salvo indicación contraria. Los precios incluyen la comisión de servicio de PartyMaps, que varía según el tier del local (5-7%). Una vez completada la compra, las entradas no son reembolsables salvo cancelación del evento por parte del local.
          </Section>

          <Section title="5. Reviews y contenido generado por usuarios">
            Al publicar una review, otorgas a PartyMaps una licencia no exclusiva para mostrarla en la plataforma. PartyMaps se reserva el derecho de eliminar contenido que incumpla las normas de la comunidad, sea ofensivo o falso.
          </Section>

          <Section title="6. Planes públicos">
            Los planes públicos son iniciativas de los propios usuarios. PartyMaps actúa como intermediario técnico y no se responsabiliza de las interacciones entre participantes.
          </Section>

          <Section title="7. Modificaciones">
            PartyMaps puede modificar estos términos en cualquier momento. Se notificará a los usuarios mediante la app cuando se produzcan cambios significativos.
          </Section>

          <Section title="8. Contacto">
            Para cualquier consulta sobre estos términos: <span className="text-[#E94560]">legal@partymaps.com</span>
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
