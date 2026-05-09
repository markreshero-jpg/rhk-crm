'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Tabs from '@/components/Tabs'
import QuoteItemTemplatesList from '@/components/templates/QuoteItemTemplatesList'
import StandaloneLineTemplatesList from '@/components/templates/StandaloneLineTemplatesList'
import StandaloneLabourTemplatesList from '@/components/templates/StandaloneLabourTemplatesList'
import TermsTemplatesList from '@/components/templates/TermsTemplatesList'
import LineStatusesList from '@/components/templates/LineStatusesList'

export default function SettingsTemplatesPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-text-subtle">Loading…</div>}>
      <SettingsTemplatesContent />
    </Suspense>
  )
}

function SettingsTemplatesContent() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'bundles'

  const tabs = [
    { id: 'bundles',   label: 'Quote Item Templates' },
    { id: 'material',  label: 'Material Lines' },
    { id: 'labour',    label: 'Labour Lines' },
    { id: 'terms',     label: 'Terms & Conditions' },
    { id: 'statuses',  label: 'Work Order Statuses' },
  ]

  return (
    <div className="p-10 max-w-7xl">
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Settings</p>
        <h2 className="text-4xl font-medium text-text tracking-tight">Templates</h2>
        <p className="text-text-muted mt-2 text-sm">Reusable building blocks for your quotes.</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab}>
        {activeTab === 'bundles'   && <QuoteItemTemplatesList />}
        {activeTab === 'material'  && <StandaloneLineTemplatesList />}
        {activeTab === 'labour'    && <StandaloneLabourTemplatesList />}
        {activeTab === 'terms'     && <TermsTemplatesList />}
        {activeTab === 'statuses'  && <LineStatusesList />}
      </Tabs>
    </div>
  )
}
