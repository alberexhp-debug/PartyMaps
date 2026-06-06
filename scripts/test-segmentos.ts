// Test de aplicarSegmento / contarSegmento (PR-10).  node scripts/test-segmentos.ts
import { aplicarSegmento, contarSegmento, SEGMENTOS_PRECREADOS, type FiltroSegmento } from '../src/lib/crm/segmentos.ts'
import type { ClienteCRM } from '../src/lib/crm/clientes.ts'

let pass = 0, fail = 0
const check = (c: boolean, m: string) => c ? (pass++, console.log('  ✅', m)) : (fail++, console.log('  ❌', m))
const hace = (d: number) => new Date(Date.now() - d * 86400000).toISOString()

const mk = (o: Partial<ClienteCRM>): ClienteCRM => ({
  usuario_id: Math.random().toString(36).slice(2), nombre: 'X', edad: 25, cumple_mes: false, foto: null, telefono: null, email: null,
  visitas: 0, entradas: 0, consumiciones: 0, gasto: 0, gasto_bar: 0, primera: null, ultima: null, vip: false, notas: null, etiquetas: [], contactable: false, ...o,
})

const clientes: ClienteCRM[] = [
  mk({ visitas: 5, gasto: 300, gasto_bar: 200, ultima: hace(40), primera: hace(200), contactable: true, vip: true }),     // recuperar, top, copas, vip
  mk({ visitas: 4, gasto: 50, gasto_bar: 5, ultima: hace(60), primera: hace(90), contactable: false }),                    // recuperar (no contactable)
  mk({ visitas: 1, gasto: 20, gasto_bar: 0, ultima: hace(5), primera: hace(5), contactable: true }),                       // nuevo
  mk({ visitas: 2, gasto: 500, gasto_bar: 400, ultima: hace(2), primera: hace(10), contactable: true, cumple_mes: true }), // top, copas, cumple
]

// 1) Recuperar = 3+ visitas y 30+ días sin venir → clientes 0 y 1.
const recuperar = SEGMENTOS_PRECREADOS.find(s => s.id === 'recuperar')!.filtros
check(aplicarSegmento(clientes, recuperar).length === 2, 'Recuperar → 2')
check(contarSegmento(clientes, recuperar).contactables === 1, 'Recuperar contactables → 1')

// 2) Gente de copas = gasto_bar_pct >= 60 → cliente 0 (66%) y 3 (80%); no 1 (10%).
const copas = SEGMENTOS_PRECREADOS.find(s => s.id === 'gente_copas')!.filtros
check(aplicarSegmento(clientes, copas).length === 2, 'Gente de copas → 2')

// 3) Cumplen este mes → cliente 3.
check(aplicarSegmento(clientes, SEGMENTOS_PRECREADOS.find(s => s.id === 'cumplen_mes')!.filtros).length === 1, 'Cumplen → 1')

// 4) Sin marketing → cliente 1 (no contactable).
check(aplicarSegmento(clientes, SEGMENTOS_PRECREADOS.find(s => s.id === 'sin_marketing')!.filtros).length === 1, 'Sin marketing → 1')

// 5) Nuevos del mes = primera visita < 30 días → clientes 2 (hace 5d) y 3 (hace 10d).
check(aplicarSegmento(clientes, SEGMENTOS_PRECREADOS.find(s => s.id === 'nuevos_mes')!.filtros).length === 2, 'Nuevos → 2')

// 6) Top gasto 10% → al menos el de mayor gasto (cliente 3, 500€).
const top = aplicarSegmento(clientes, SEGMENTOS_PRECREADOS.find(s => s.id === 'top_gasto')!.filtros)
check(top.length === 1 && top[0].gasto === 500, 'Top gasto → el de 500€')

// 7) Filtro AND custom: visitas>=3 Y vip=true → solo cliente 0.
const custom: FiltroSegmento[] = [{ campo: 'visitas', op: '>=', valor: 3 }, { campo: 'vip', op: '=', valor: true }]
check(aplicarSegmento(clientes, custom).length === 1, 'AND (visitas>=3 & vip) → 1')

console.log(`\n  ${pass}/${pass + fail} OK${fail ? ` · ${fail} FALLAN` : ''}`)
process.exit(fail ? 1 : 0)
