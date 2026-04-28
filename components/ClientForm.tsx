'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Client } from '@/lib/clients'
import EditableSelect from './EditableSelect'

type ClientFormProps = {
  initialData?: Partial<Client>
  onSubmit: (data: Partial<Client>) => Promise<void>
  onDelete?: () => Promise<void>
  submitLabel?: string
}

export default function ClientForm({
  initialData = {},
  onSubmit,
  onDelete,
  submitLabel = 'Save Client',
}: ClientFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<Client>>({
    name: initialData.name || '',
    contact_person: initialData.contact_person || '',
    phone: initialData.phone || '',
    mobile: initialData.mobile || '',
    email: initialData.email || '',
    address_line_1: initialData.address_line_1 || '',
    address_line_2: initialData.address_line_2 || '',
    suburb: initialData.suburb || '',
    postcode: initialData.postcode || '',
    client_type: initialData.client_type || null,
    client_source: initialData.client_source || null,
    referred_by: initialData.referred_by || '',
    notes: initialData.notes || '',
    is_active: initialData.is_active ?? true,
  })

  const handleChange = (field: keyof Client, value: string | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name?.trim()) {
      setError('Name is required')
      return
    }

    setIsSubmitting(true)
    try {
      // Clean empty strings → null so the database doesn't store empty values
      const cleanData = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [
          k,
          v === '' ? null : v,
        ])
      )
      await onSubmit(cleanData)
      router.push('/clients')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Delete this client? This cannot be undone.')) return

    setIsSubmitting(true)
    try {
      await onDelete()
      router.push('/clients')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      setError(message)
      setIsSubmitting(false)
    }
  }

  const showReferredBy = formData.client_source === 'Referral'

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Basic info */}
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">
          Basic Information
        </h3>

        <Field label="Name" required>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className={inputClass}
            placeholder="Full name or company name"
          />
        </Field>

        <Field label="Contact Person">
          <input
            type="text"
            value={formData.contact_person || ''}
            onChange={(e) => handleChange('contact_person', e.target.value)}
            className={inputClass}
            placeholder="If above is a company, who's the main contact?"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
        <Field label="Client Type">
            <EditableSelect
              listName="client_type"
              value={formData.client_type || null}
              onChange={(v) => handleChange('client_type', v)}
            />
          </Field>

          <Field label="Client Source">
            <select
              value={formData.client_source || ''}
              onChange={(e) =>
                handleChange('client_source', e.target.value || null)
              }
              className={inputClass}
            >
              <option value="">— Select —</option>
              <option value="Referral">Referral</option>
              <option value="Walk In">Walk In</option>
              <option value="Website">Website</option>
              <option value="Repeat">Repeat</option>
              <option value="Unknown">Unknown</option>
            </select>
          </Field>
        </div>

        {showReferredBy && (
          <Field label="Referred By">
            <input
              type="text"
              value={formData.referred_by || ''}
              onChange={(e) => handleChange('referred_by', e.target.value)}
              className={inputClass}
              placeholder="Who referred them?"
            />
          </Field>
        )}
      </section>

      {/* Contact */}
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">
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

          <Field label="Mobile">
            <input
              type="tel"
              value={formData.mobile || ''}
              onChange={(e) => handleChange('mobile', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Email">
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className={inputClass}
          />
        </Field>
      </section>

      {/* Address */}
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">
          Address
        </h3>

        <Field label="Street Address">
          <input
            type="text"
            value={formData.address_line_1 || ''}
            onChange={(e) => handleChange('address_line_1', e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Address Line 2">
          <input
            type="text"
            value={formData.address_line_2 || ''}
            onChange={(e) => handleChange('address_line_2', e.target.value)}
            className={inputClass}
            placeholder="Optional"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Suburb">
            <input
              type="text"
              value={formData.suburb || ''}
              onChange={(e) => handleChange('suburb', e.target.value)}
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
        <h3 className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">
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

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-200">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="text-sm text-red-700 hover:text-red-900 disabled:opacity-50"
            >
              Delete client
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-stone-700 bg-white border border-stone-200 rounded-md hover:bg-stone-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-white bg-stone-900 rounded-md hover:bg-stone-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

const inputClass =
  'w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-md focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100'

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
      <span className="block text-xs font-medium text-stone-700 mb-1.5">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </span>
      {children}
    </label>
  )
}