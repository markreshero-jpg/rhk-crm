'use client'

import { useState } from 'react'
import Tabs from '@/components/Tabs'
import { useSearchParams } from 'next/navigation'
import QuoteItemTemplatesList from '@/components/templates/QuoteItemTemplatesList'
import StandaloneLineTemplatesList from '@/components/templates/StandaloneLineTemplatesList'
import StandaloneLabourTemplatesList from '@/components/templates/StandaloneLabourTemplatesList'

export default function TemplatesPage() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'bundles'

  const tabs = [
    { id: 'bundles', label: 'Quote Item Templates' },
    { id: 'material', label: 'Material Lines' },
    { id: 'labour', label: 'Labour Lines' },
  ]

  return (
    <div className="p-10 max-w-7xl">
      <p className="text-xs uppercase tracking-widest text-text-subtle mb-2">
        Workspace
      </p>
      <h2 className="text-4xl font-medium text-text tracking-tight mb-2">
        Templates
      </h2>
      <p className="text-text-muted mt-2 mb-6 text-sm">
        Reusable building blocks for your quotes.
      </p>

      <Tabs tabs={tabs} activeTab={activeTab}>
        {activeTab === 'bundles' && <QuoteItemTemplatesList />}
        {activeTab === 'material' && <StandaloneLineTemplatesList />}
        {activeTab === 'labour' && <StandaloneLabourTemplatesList />}
      </Tabs>
    </div>
  )
}