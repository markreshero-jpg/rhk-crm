'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Supplier } from '@/lib/suppliers'

type SupplierFormProps = {
  initialData?: Partial<Supplier>
  onSubmit: (data: Partial<Supplier>) => Promise<void>
  onDelete?: () => Promise<void>
  submitLabel?: string
}

export default function SupplierForm({
  initialData = {},
  onSubmit,
  onDelete,
  submitLabel = 'Save Supplier',
}: SupplierFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<Supplier>>({
    company_name: initialData.company_name || '',
    contact_name: initialData.contact_name || '',
    phone: initialData.phone || '',
    email: initialData.email || '',
    emails: initialData.emails || [],
    address_line1: initialData.address_line1 || '',
    address_line2: initialData.address_line2 || '',
    city: initialData.city || '',
    state: initialData.state || '',
    postcode: initialData.postcode || '',
    notes: initialData.notes || '',
  })

  const extraEmails = (formData.emails || [])

  function addEmail() {
    setFormData((prev) => ({ ...prev, emails: [...(prev.emails || []), ''] }))
  }

  function updateEmail(index: number, value: string) {
    setFormData((prev) => {
      const next = [...(prev.emails || [])]
      next[index] = value
      return { ...prev, emails: next }
    })
  }

  function removeEmail(index: number) {
    setFormData((prev) => {
      const next = [...(prev.emails || [])]
      next.splice(index, 1)
      return { ...prev, emails: next }
    })
  }

  const handleChange = (field: keyof Supplier, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.company_name?.trim()) {
      setError('Company name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const cleanData = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [k, v === '' ? null : v])
      )
      cleanData.emails = (formData.emails || []).filter((e) => e.trim() !== '')
      await onSubmit(cleanData)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Delete this supplier? This cannot be undone.')) return

    setIsSubmitting(true)
    try {
      await onDelete()
      router.push('/suppliers')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      setError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {error && (
        <div className="bg-danger-bg border border-danger-border text-danger px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Basic Information
        </h3>

        <Field label="Company Name" required>
          <input
            type="text"
            value={formData.company_name || ''}
            onChange={(e) => handleChange('company_name', e.target.value)}
            className={inputClass}
            placeholder="Supplier company name"
          />
        </Field>

        <Field label="Contact Name">
          <input
            type="text"
            value={formData.contact_name || ''}
            onChange={(e) => handleChange('contact_name', e.target.value)}
            className={inputClass}
            placeholder="Primary contact person"
          />
        </Field>
      </section>

      {/* Contact Details */}
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Contact Details
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Primary Email">
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted">Additional Emails</span>
            <button type="button" onClick={addEmail}
              className="flex items-center gap-1 text-xs text-accent-text bg-accent px-2 py-1 rounded-md hover:bg-accent-hover transition-colors">
              <Plus size={11} /> Add Email
            </button>
          </div>
          {extraEmails.length === 0 ? (
            <p className="text-xs text-text-faint italic">No additional emails — click Add Email to add more recipients.</p>
          ) : (
            <div className="space-y-2">
              {extraEmails.map((email, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(i, e.target.value)}
                    placeholder={`Email ${i + 2}`}
                    className={inputClass + ' flex-1'}
                  />
                  <button type="button" onClick={() => removeEmail(i)}
                    className="text-text-faint hover:text-danger transition-colors shrink-0">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Address */}
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Address
        </h3>

        <Field label="Address Line 1">
          <input
            type="text"
            value={formData.address_line1 || ''}
            onChange={(e) => handleChange('address_line1', e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Address Line 2">
          <input
            type="text"
            value={formData.address_line2 || ''}
            onChange={(e) => handleChange('address_line2', e.target.value)}
            className={inputClass}
            placeholder="Optional"
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="City">
            <input
              type="text"
              value={formData.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="State">
            <input
              type="text"
              value={formData.state || ''}
              onChange={(e) => handleChange('state', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Postcode">
            <input
              type="text"
              value={formData.postcode || ''}
              onChange={(e) => handleChange('postcode', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Notes
        </h3>
        <Field label="Notes">
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            className={inputClass + ' resize-none'}
            placeholder="Anything worth remembering..."
          />
        </Field>
      </section>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="text-sm text-danger hover:opacity-80 disabled:opacity-50"
            >
              Delete supplier
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-text-muted bg-surface border border-border-strong rounded-md hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-accent-text bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

const inputClass =
  'w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border'

function Field({
  label,
  required = false,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-text-muted mb-1.5">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </span>
      {children}
    </label>
  )
}