'use client'

import { useRouter } from 'next/navigation'
import SupplierForm from '@/components/SupplierForm'
import { createSupplier } from '@/lib/suppliers'
import { Supplier } from '@/lib/suppliers'

export default function NewSupplierPage() {
  const router = useRouter()

  const handleSubmit = async (data: Partial<Supplier>) => {
    await createSupplier(data as Omit<Supplier, 'id' | 'created_at'>)
    router.push('/suppliers')
    router.refresh()
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text">New Supplier</h1>
        <p className="text-sm text-text-subtle mt-0.5">Add a new supplier to your database</p>
      </div>
      <SupplierForm onSubmit={handleSubmit} onCancel={() => router.back()} submitLabel="Save Supplier" />
    </div>
  )
}