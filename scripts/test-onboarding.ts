// Test de resolverOnboarding (PR-7) — función pura, sin red.  node scripts/test-onboarding.ts
import { resolverOnboarding, type OnboardingCtx } from '../src/lib/onboarding/pasos.ts'

let pass = 0, fail = 0
const check = (cond: boolean, msg: string) => cond ? (pass++, console.log('  ✅', msg)) : (fail++, console.log('  ❌', msg))

const ctxVacio = (over: Partial<OnboardingCtx> = {}): OnboardingCtx => ({
  local: {}, equipoCount: 0, productosActivosCount: 0, eventosPublicadosCount: 0,
  mesasCount: 0, rrppCount: 0, pasosVisitados: [], ...over,
})

// 1) Dueño con local vacío: todo pendiente; sala NO aplica (reservas off).
console.log('1) Dueño, local vacío')
{
  const r = resolverOnboarding('dueno', ctxVacio())
  check(r.pasos.length === 9, `9 pasos (10 - sala no aplica) → ${r.pasos.length}`)
  check(r.obligatoriosPendientes === 4, `4 obligatorios pendientes (datos, horarios, fotos, aforo) → ${r.obligatoriosPendientes}`)
  check(r.pct === 0, `pct 0 → ${r.pct}`)
  check(!r.pasos.some(p => p.id === 'sala'), 'sala ausente (reservas off)')
}

// 2) Dueño, todo completo (con reservas + mesa): 10 pasos, todo hecho.
console.log('\n2) Dueño, todo completo')
{
  const r = resolverOnboarding('dueno', ctxVacio({
    local: {
      nombre: 'X', direccion: 'Calle 1', latitud: 40.4, longitud: -3.7, tipo_local: 'discoteca', musica: ['techno'],
      horario: { viernes: { apertura: '23:30', cierre: '06:00' } }, imagenes: ['a.jpg'],
      aforo_maximo: 200, reservas_activas: true,
    },
    equipoCount: 3, productosActivosCount: 5, eventosPublicadosCount: 2, mesasCount: 4, rrppCount: 1,
    pasosVisitados: ['tier'],
  }))
  check(r.pasos.length === 10, `10 pasos (sala aplica) → ${r.pasos.length}`)
  check(r.pct === 100, `pct 100 → ${r.pct}`)
  check(r.obligatoriosPendientes === 0, `0 obligatorios pendientes → ${r.obligatoriosPendientes}`)
}

// 3) Gestor: sin paso "tier".
console.log('\n3) Gestor, local vacío')
{
  const r = resolverOnboarding('gestor', ctxVacio())
  check(!r.pasos.some(p => p.id === 'tier'), 'gestor no tiene el paso tier')
  check(r.pasos.length === 8, `8 pasos (dueño 9 - tier) → ${r.pasos.length}`)
  check(r.obligatoriosPendientes === 4, `4 obligatorios → ${r.obligatoriosPendientes}`)
}

// 4) Sala condicional: reservas on pero sin mesas → aparece pendiente.
console.log('\n4) Sala condicional')
{
  const conReservas = resolverOnboarding('dueno', ctxVacio({ local: { reservas_activas: true } }))
  const sala = conReservas.pasos.find(p => p.id === 'sala')
  check(!!sala && sala.estado === 'pendiente', 'reservas on + 0 mesas → sala pendiente')
  const sinReservas = resolverOnboarding('dueno', ctxVacio({ local: { reservas_activas: false } }))
  check(!sinReservas.pasos.some(p => p.id === 'sala'), 'reservas off → sala no aparece')
}

// 5) Datos básicos: requiere TODOS los campos.
console.log('\n5) Datos básicos (parcial → pendiente)')
{
  const r = resolverOnboarding('dueno', ctxVacio({ local: { nombre: 'X', direccion: 'C/1', latitud: 40, longitud: -3, tipo_local: 'bar_copas' } })) // sin música
  check(r.pasos.find(p => p.id === 'datos')?.estado === 'pendiente', 'sin música → datos básicos pendiente')
  const r2 = resolverOnboarding('dueno', ctxVacio({ local: { nombre: 'X', direccion: 'C/1', latitud: 40, longitud: -3, tipo_local: 'bar_copas', musica: ['pop'] } }))
  check(r2.pasos.find(p => p.id === 'datos')?.estado === 'hecho', 'con todos los campos → datos básicos hecho')
}

console.log(`\n  ${pass}/${pass + fail} OK${fail ? ` · ${fail} FALLAN` : ''}`)
process.exit(fail ? 1 : 0)
