'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Bucket = 'concursos' | 'retos' | 'reviews' | 'perfiles' | 'locales' | 'eventos'

interface PhotoUploadProps {
  bucket: Bucket
  path: string
  onUpload: (publicUrl: string) => void
  onError?: (err: string) => void
  accept?: string
  maxSizeMB?: number
  className?: string
  label?: string
  currentUrl?: string
  variant?: 'square' | 'circle' | 'wide'
}

export function PhotoUpload({
  bucket,
  path,
  onUpload,
  onError,
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 5,
  className,
  label = 'Subir foto',
  currentUrl,
  variant = 'square',
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onError?.('Solo se permiten imágenes')
      return
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      onError?.(`La imagen supera ${maxSizeMB}MB`)
      return
    }

    setSubiendo(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${path}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    try {
      const localPreview = URL.createObjectURL(file)
      setPreview(localPreview)

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (error) throw error

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName)
      onUpload(urlData.publicUrl)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo subir la imagen'
      onError?.(msg)
      setPreview(currentUrl || null)
    } finally {
      setSubiendo(false)
    }
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const sizeClasses = {
    square: 'w-32 h-32 rounded-2xl',
    circle: 'w-28 h-28 rounded-full',
    wide: 'w-full aspect-[16/9] rounded-2xl',
  }[variant]

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className={cn(
          sizeClasses,
          'relative overflow-hidden bg-[#1A1A2E] border-2 border-dashed border-[#2A2A3E] flex items-center justify-center hover:border-[#E94560]/50 transition-colors disabled:opacity-50',
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-[#505065]">
            <Camera size={22} />
            <span className="text-[11px] font-medium">{label}</span>
          </div>
        )}
        {subiendo && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 size={22} className="text-white animate-spin" />
          </div>
        )}
      </button>
      {preview && !subiendo && (
        <button
          type="button"
          onClick={() => { setPreview(null); onUpload('') }}
          className="mt-2 text-xs text-[#E94560] hover:underline flex items-center gap-1"
        >
          <X size={12} /> Quitar foto
        </button>
      )}
    </div>
  )
}
