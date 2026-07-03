'use client'
import { useEffect, useRef, useState } from 'react'

// Número que cuenta hacia arriba al entrar en pantalla (una sola vez).
// Respeta prefers-reduced-motion mostrando el valor final directamente.
export function CountUp({
  value, duration = 900, decimals = 0, prefix = '', suffix = '', className = '',
}: {
  value: number; duration?: number; decimals?: number; prefix?: string; suffix?: string; className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(0)
  const done = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || done.current) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value); done.current = true; return
    }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done.current) return
      done.current = true
      io.disconnect()
      const t0 = performance.now()
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        setShown(value * eased)
        if (p < 1) requestAnimationFrame(tick)
        else setShown(value)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [value, duration])

  const txt = decimals > 0 ? shown.toFixed(decimals) : Math.round(shown).toLocaleString('es-ES')
  return <span ref={ref} className={className}>{prefix}{txt}{suffix}</span>
}

// Barra de progreso que se rellena al entrar en pantalla.
export function FillBar({
  pct, color, trackClassName = 'h-1.5 w-full rounded-full bg-white/8 overflow-hidden', duration = 800,
}: {
  pct: number; color: string; trackClassName?: string; duration?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setOn(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={trackClassName}>
      <div
        className="h-full rounded-full"
        style={{
          width: on ? `${Math.min(100, Math.max(0, pct))}%` : '0%',
          background: color,
          transition: `width ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      />
    </div>
  )
}

// Anima la parte numérica de un valor formateado ("3.180€", "6.4k", "16/64", "+193").
// Heurística es-ES: punto con 3 dígitos detrás = separador de miles; si no, decimal.
export function AnimatedValue({ value, className = '' }: { value: string; className?: string }) {
  const m = value.match(/^([^0-9]*)([0-9][0-9.,]*)(.*)$/)
  if (!m) return <span className={className}>{value}</span>
  const [, prefix, num, suffix] = m
  let n: number
  let decimals = 0
  if (/\.\d{3}(\D|$)/.test(num) || /^\d{1,3}(\.\d{3})+$/.test(num)) {
    n = parseFloat(num.replace(/\./g, ''))
  } else {
    n = parseFloat(num.replace(',', '.'))
    decimals = (num.split(/[.,]/)[1] || '').length
  }
  if (!isFinite(n)) return <span className={className}>{value}</span>
  return <CountUp value={n} decimals={decimals} prefix={prefix} suffix={suffix} className={className} />
}
