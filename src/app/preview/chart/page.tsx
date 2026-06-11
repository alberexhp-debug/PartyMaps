'use client'
// Verificación de la gráfica multi-línea de la home del panel (datos de ejemplo).
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const SERIE = [
  { dia: '05/06', ingresos: 320, entradas: 42, pedidos: 18 },
  { dia: '06/06', ingresos: 180, entradas: 25, pedidos: 9 },
  { dia: '07/06', ingresos: 540, entradas: 71, pedidos: 33 },
  { dia: '08/06', ingresos: 610, entradas: 80, pedidos: 40 },
  { dia: '09/06', ingresos: 240, entradas: 30, pedidos: 12 },
  { dia: '10/06', ingresos: 430, entradas: 55, pedidos: 22 },
  { dia: '11/06', ingresos: 720, entradas: 95, pedidos: 48 },
]

export default function PreviewChart() {
  return (
    <div data-pt="light" style={{ minHeight: '100dvh', padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 16, boxShadow: 'var(--p-shadow)', padding: '16px 14px 12px' }}>
        <p style={{ margin: '0 0 12px 4px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--p-text-3)' }}>Últimos 7 días</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={SERIE} margin={{ top: 4, right: 6, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(130,130,150,0.16)" vertical={false} />
            <XAxis dataKey="dia" tick={{ fill: '#9A9AA6', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: '#9A9AA6', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9A9AA6', fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
            <Tooltip contentStyle={{ background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 12, fontSize: 12, color: 'var(--p-text)', boxShadow: 'var(--p-shadow)' }} labelStyle={{ color: 'var(--p-text-2)', fontWeight: 600 }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="plainline" />
            <Line yAxisId="left" type="monotone" dataKey="ingresos" name="Ingresos €" stroke="#E0455E" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="entradas" name="Entradas" stroke="#4F8EF7" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="pedidos" name="Pedidos" stroke="#F39C12" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
