'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getSupplierById, updateSupplier, deleteSupplier, Supplier } from '@/lib/suppliers'
import SupplierForm from '@/components/SupplierForm'
import SupplierItemsPortal from '@/components/SupplierItemsPortal'
import Tabs from '@/components/Tabs'

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'items', label: 'Items' },
]

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'details'

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSupplierById(id)
      .then(setSupplier)
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (data: Partial<Supplier>) => {
    await updateSupplier(id, data)
    router.refresh()
  }

  const handleDelete = async () => {
    await deleteSupplier(id)
    router.push('/suppliers')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-text-subtle text-sm">Loading...</p>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="p-8">
        <p className="text-text-subtle text-sm">Supplier not found.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text">{supplier.company_name}</h1>
        <p className="text-sm text-text-subtle mt-0.5">
          {supplier.city ? `${supplier.city} · ` : ''}Supplier
        </p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab}>
        {activeTab === 'details' && (
          <SupplierForm
            initialData={supplier}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            submitLabel="Save Changes"
          />
        )}
        {activeTab === 'items' && (
          <SupplierItemsPortal supplierId={id} />
        )}
      </Tabs>
    </div>
  )
}