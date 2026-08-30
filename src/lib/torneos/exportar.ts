'use client'

// Export de resultados a CSV (para Power Rankings locales, paneles y archivo).
// Los rankings comunitarios aceptan fuentes externas si son verificables: este
// CSV es el puente cuando el bracket vive en Torneum y no en start.gg.
export function descargarCSV(nombre: string, filas: string[][]) {
  const escapar = (c: string) => /[",\n;]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c
  const csv = filas.map(f => f.map(escapar).join(',')).join('\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre.replace(/[^a-z0-9-_]/gi, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
