// Test unitario de `estadoApertura` — los 15 casos de la tabla §9 del doc 03.
// Función PURA: se le pasa `ahora`. Se corre con la zona de Madrid para reproducir
// el cliente:   TZ=Europe/Madrid node scripts/test-horarios.ts
import { estadoApertura, textoEstadoFicha, type ResultadoEstado } from '../src/lib/horarios.ts'

// Horario de referencia del doc §9: noche del viernes y del sábado 23:30–06:00; resto cerrado.
const REF = {
  viernes: { apertura: '23:30', cierre: '06:00' },
  sabado: { apertura: '23:30', cierre: '06:00' },
}
// Semana concreta: junio 2026 empieza en lunes → 05=vie 06=sáb 07=dom 08=lun 10=mié 11=jue 12=vie.
const d = (s: string) => new Date(s) // sin 'Z' = hora local (Madrid con TZ=Europe/Madrid)

let pass = 0, fail = 0
function check(n: number, desc: string, real: ResultadoEstado, esperado: Partial<ResultadoEstado> & { ficha?: string | null }, ahora: Date) {
  const errores: string[] = []
  if (esperado.estado && real.estado !== esperado.estado) errores.push(`estado: ${real.estado} ≠ ${esperado.estado}`)
  if (esperado.horaRelevante !== undefined && real.horaRelevante !== esperado.horaRelevante) errores.push(`horaRelevante: ${real.horaRelevante} ≠ ${esperado.horaRelevante}`)
  if (esperado.ficha !== undefined) { const f = textoEstadoFicha(real, ahora); if (f !== esperado.ficha) errores.push(`ficha: "${f}" ≠ "${esperado.ficha}"`) }
  if (errores.length) { fail++; console.log(`  ❌ #${n} ${desc}\n       ${errores.join('\n       ')}`) }
  else { pass++; console.log(`  ✅ #${n} ${desc}`) }
}

const ev = [{ inicio: '2026-06-10T23:00', fin: '2026-06-11T05:00' }] // evento miércoles noche

// 1
check(1, 'Viernes 22:00 → abre_pronto 23:30', estadoApertura({ horario: REF, cerrado_hasta: null }, d('2026-06-05T22:00')), { estado: 'abre_pronto', horaRelevante: '23:30' }, d('2026-06-05T22:00'))
// 2
check(2, 'Viernes 21:29 → cerrado (faltan 2h01)', estadoApertura({ horario: REF, cerrado_hasta: null }, d('2026-06-05T21:29')), { estado: 'cerrado' }, d('2026-06-05T21:29'))
// 3
check(3, 'Viernes 21:30 → abre_pronto (exactamente 2h)', estadoApertura({ horario: REF, cerrado_hasta: null }, d('2026-06-05T21:30')), { estado: 'abre_pronto', horaRelevante: '23:30' }, d('2026-06-05T21:30'))
// 4
check(4, 'Viernes 23:30 → abierto, cierra 06:00', estadoApertura({ horario: REF, cerrado_hasta: null }, d('2026-06-05T23:30')), { estado: 'abierto', horaRelevante: '06:00', ficha: 'Abierto · cierra a las 06:00' }, d('2026-06-05T23:30'))
// 5
check(5, 'Sábado 03:00 → abierto (madrugada del viernes, bug clásico)', estadoApertura({ horario: REF, cerrado_hasta: null }, d('2026-06-06T03:00')), { estado: 'abierto', horaRelevante: '06:00' }, d('2026-06-06T03:00'))
// 6
check(6, 'Sábado 06:00 → cerrado, abre hoy 23:30', estadoApertura({ horario: REF, cerrado_hasta: null }, d('2026-06-06T06:00')), { estado: 'cerrado', ficha: 'Cerrado · abre hoy a las 23:30' }, d('2026-06-06T06:00'))
// 7
check(7, 'Sábado 22:00 → abre_pronto 23:30', estadoApertura({ horario: REF, cerrado_hasta: null }, d('2026-06-06T22:00')), { estado: 'abre_pronto', horaRelevante: '23:30' }, d('2026-06-06T22:00'))
// 8
check(8, 'Domingo 03:00 → abierto (madrugada del sábado)', estadoApertura({ horario: REF, cerrado_hasta: null }, d('2026-06-07T03:00')), { estado: 'abierto', horaRelevante: '06:00' }, d('2026-06-07T03:00'))
// 9
check(9, 'Lunes 23:00 → cerrado, abre viernes 23:30', estadoApertura({ horario: REF, cerrado_hasta: null }, d('2026-06-08T23:00')), { estado: 'cerrado', ficha: 'Cerrado · abre viernes a las 23:30' }, d('2026-06-08T23:00'))
// 10
check(10, 'Miércoles 21:30 + evento 23:00 → abre_pronto por el evento', estadoApertura({ horario: REF, cerrado_hasta: null }, d('2026-06-10T21:30'), ev), { estado: 'abre_pronto', horaRelevante: '23:00' }, d('2026-06-10T21:30'))
// 11
check(11, 'Jueves 02:00 + evento → abierto por el evento (cierra 05:00)', estadoApertura({ horario: REF, cerrado_hasta: null }, d('2026-06-11T02:00'), ev), { estado: 'abierto', horaRelevante: '05:00' }, d('2026-06-11T02:00'))
// 12
check(12, 'Viernes 23:00 + "cerrar esta noche" → cerrado (toggle manda)', estadoApertura({ horario: REF, cerrado_hasta: '2026-06-06T12:00' }, d('2026-06-05T23:00')), { estado: 'cerrado' }, d('2026-06-05T23:00'))
// 13 — el toggle del viernes ya caducó (12:00 del sábado): el resultado debe ser idéntico a no tener toggle.
{
  const ahora = d('2026-06-06T13:00')
  const conToggle = estadoApertura({ horario: REF, cerrado_hasta: '2026-06-06T12:00' }, ahora)
  const sinToggle = estadoApertura({ horario: REF, cerrado_hasta: null }, ahora)
  const igual = JSON.stringify(conToggle) === JSON.stringify(sinToggle)
  if (igual && conToggle.estado === 'cerrado') { pass++; console.log('  ✅ #13 Sábado 13:00 → toggle del viernes caducó (estado normal)') }
  else { fail++; console.log(`  ❌ #13 toggle no caducó: conToggle=${JSON.stringify(conToggle)} sinToggle=${JSON.stringify(sinToggle)}`) }
}
// 14
check(14, 'Local sin horario, jueves 23:00 → sin_datos', estadoApertura({ horario: {}, cerrado_hasta: null }, d('2026-06-11T23:00')), { estado: 'sin_datos', ficha: null }, d('2026-06-11T23:00'))
// 15
check(15, 'Sin horario + evento hoy 23:00, a las 21:00 → abre_pronto 23:00', estadoApertura({ horario: {}, cerrado_hasta: null }, d('2026-06-11T21:00'), [{ inicio: '2026-06-11T23:00', fin: null }]), { estado: 'abre_pronto', horaRelevante: '23:00' }, d('2026-06-11T21:00'))

console.log(`\n  ${pass}/${pass + fail} casos OK${fail ? ` · ${fail} FALLAN` : ''}`)
process.exit(fail ? 1 : 0)
