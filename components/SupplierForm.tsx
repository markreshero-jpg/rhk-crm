'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Supplier } from '@/lib/suppliers'

type SupplierFormProps = {
  initialData?: Partial<Supplier>
  onSubmit: (data: Partial<Supplier>) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel?: () => void
  submitLabel?: string
  compact?: boolean
}

export default function SupplierForm({
  initialData = {},
  onSubmit,
  onDelete,
  onCancel,
  submitLabel = 'Save Supplier',
  compact = false,
}: SupplierFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<Supplier>>({
    company_name:  initialData.company_name  || '',
    contact_name:  initialData.contact_name  || '',
    phone:         initialData.phone         || '',
    email:         initialData.email         || '',
    emails:        initialData.emails        || [],
    address_line1: initialData.address_line1 || '',
    address_line2: initialData.address_line2 || '',
    city:          initialData.city          || '',
    state:         initialData.state         || '',
    postcode:      initialData.postcode      || '',
    notes:         initialData.notes         || '',
  })

  const extraEmails = formData.emails || []

  function addEmail() {
    setFormData((p) => ({ ...p, emails: [...(p.emails || []), ''] }))
  }
  function updateEmail(i: number, v: string) {
    setFormData((p) => { const next = [...(p.emails || [])]; next[i] = v; return { ...p, emails: next } })
  }
  function removeEmail(i: number) {
    setFormData((p) => { const next = [...(p.emails || [])]; next.splice(i, 1); return { ...p, emails: next } })
  }

  const set = (field: keyof Supplier, value: string) =>
    setFormData((p) => ({ ...p, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!formData.company_name?.trim()) { setError('Company name is required'); return }
    setIsSubmitting(true)
    try {
      const clean = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [k, v === '' ? null : v])
      )
      clean.emails = (formData.emails || []).filter((e) => e.trim() !== '')
      await onSubmit(clean)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Delete this supplier? This cannot be undone.')) return
    setIsSubmitting(true)
    try {
      await onDelete()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-danger-bg border border-danger-border text-danger px-3 py-2.5 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Row 1: Company name + Contact name */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label>Company Name <span className="text-danger">*</span></Label>
          <input
            type="text"
            value={formData.company_name || ''}
            onChange={(e) => set('company_name', e.target.value)}
            placeholder="Supplier company name"
            className={inputCls}
          />
        </div>
        <div>
          <Label>Contact Name</Label>
          <input
            type="text"
            value={formData.contact_name || ''}
            onChange={(e) => set('contact_name', e.target.value)}
            placeholder="Primary contact"
            className={inputCls}
          />
        </div>
      </div>

      {/* Row 2: Phone + Primary email */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Phone</Label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => set('phone', e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <Label>Primary Email</Label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => set('email', e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Additional emails */}
      {(extraEmails.length > 0 || !compact) && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>Additional Emails</Label>
            <button type="button" onClick={addEmail}
              className="flex items-center gap-1 text-xs text-accent-text bg-accent px-2 py-1 rounded-md hover:bg-accent-hover transition-colors">
              <Plus size={11} /> Add
            </button>
          </div>
          {extraEmails.length === 0 ? (
            <p className="text-xs text-text-faint italic">None added.</p>
          ) : (
            <div className="space-y-2">
              {extraEmails.map((email, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(i, e.target.value)}
                    placeholder={`Email ${i + 2}`}
                    className={inputCls + ' flex-1'}
                  />
                  <button type="button" onClick={() => removeEmail(i)}
                    className="text-text-faint hover:text-danger transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expanded: address + notes */}
      {!compact && (
        <>
          {/* Row: Address line 1 + line 2 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Address Line 1</Label>
              <input type="text" value={formData.address_line1 || ''} onChange={(e) => set('address_line1', e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label>Address Line 2</Label>
              <input type="text" value={formData.address_line2 || ''} onChange={(e) => set('address_line2', e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
          </div>

          {/* Row: City + State + Postcode */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>City</Label>
              <input type="text" value={formData.city || ''} onChange={(e) => set('city', e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label>State</Label>
              <input type="text" value={formData.state || ''} onChange={(e) => set('state', e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label>Postcode</Label>
              <input type="text" value={formData.postcode || ''} onChange={(e) => set('postcode', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Anything worth remembering…"
              className={inputCls + ' resize-none w-full'}
            />
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
        <div>
          {onDelete && (
            <button type="button" onClick={handleDelete} disabled={isSubmitting}
              className="text-sm text-danger hover:opacity-80 disabled:opacity-50">
              Delete supplier
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} disabled={isSubmitting}
              className="px-3 py-1.5 text-sm text-text-muted bg-surface border border-border-strong rounded-md hover:bg-surface-hover disabled:opacity-50">
              Cancel
            </button>
          )}
          <button type="submit" disabled={isSubmitting}
            className="px-3 py-1.5 text-sm text-accent-text bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50">
            {isSubmitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs font-medium text-text-muted mb-1">{children}</span>
}

const inputCls = 'w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border'
