import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function TerminosPage() {
  return (
    <div className="min-h-screen">
      <div className="px-5 pt-12 pb-20 max-w-2xl mx-auto">
        <Link href="/inicio" className="inline-flex items-center gap-2 text-[#A0A0B8] mb-8 hover:text-white transition-colors">
          <ChevronLeft size={18} /> Volver
        </Link>

        <h1 className="text-2xl font-bold text-white mb-2">Términos de uso</h1>
        <p className="text-sm text-[#6B6B85] mb-8">Última actualización: mayo 2026</p>

        <div className="space-y-8 text-sm text-[#A0A0B8] leading-relaxed">
          <Section title="1. Aceptación de los términos">
            Al crear una cuenta en Torneum y usar la plataforma, aceptas estos Términos de Uso. Si no estás de acuerdo, no debes usar el servicio. Torneum está destinado exclusivamente a personas mayores de 18 años.
          </Section>

          <Section title="2. Registro y cuenta">
            Para acceder a las funcionalidades completas debes registrarte con un número de teléfono válido. Eres responsable de mantener la seguridad de tu cuenta y de toda la actividad que ocurra en ella. Torneum no se responsabiliza del uso no autorizado de tu cuenta.
          </Section>

          <Section title="3. Uso permitido">
            Puedes usar Torneum para descubrir torneos, inscribirte y pagar tu plaza, organizar torneos como TO, ofrecer tu sala como local y competir en el ranking. Queda prohibido el uso fraudulento, la reventa no autorizada de inscripciones, el amaño de resultados o cualquier actividad ilegal.
          </Section>

          <Section title="4. Inscripciones y pagos">
            Las inscripciones compradas a través de Torneum son nominales y no transferibles salvo indicación contraria. El precio incluye la comisión de servicio de Torneum según el tamaño del torneo (6% hasta 32 inscritos, 8% hasta 128, 10% por encima). Si cancelas tu inscripción con más de 24 horas de antelación sobre el inicio del torneo, se te devuelve el 100% automáticamente; con menos de 24 horas, la inscripción no se reembolsa. Si el organizador cancela el torneo, los jugadores recuperan el 100% automáticamente vía Stripe.
          </Section>

          <Section title="5. Reviews y contenido generado por usuarios">
            Al publicar una review, otorgas a Torneum una licencia no exclusiva para mostrarla en la plataforma. Torneum se reserva el derecho de eliminar contenido que incumpla las normas de la comunidad, sea ofensivo o falso.
          </Section>

          <Section title="6. Resultados y disputas">
            Los resultados los reportan los jugadores por consenso (el ganador reporta, el rival confirma). En caso de desacuerdo, el organizador resuelve la disputa. Torneum actúa como intermediario técnico y registra quién reporta y confirma como medida anti-abuso.
          </Section>

          <Section title="7. Modificaciones">
            Torneum puede modificar estos términos en cualquier momento. Se notificará a los usuarios mediante la app cuando se produzcan cambios significativos.
          </Section>

          <Section title="8. Contacto">
            Para cualquier consulta sobre estos términos: <span className="text-[#B6FF3A]">legal@torneum.app</span>
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
