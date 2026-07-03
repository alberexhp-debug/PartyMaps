'use client'
import { useParams } from 'next/navigation'
import { PerfilOrganizador } from '@/components/todh/PerfilOrganizador'

export default function OrganizadorPage() {
  const { id } = useParams<{ id: string }>()
  return <PerfilOrganizador id={id} />
}
