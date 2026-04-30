'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { Job } from '@/lib/jobs'
import { getAllClients, getClientContact, Client, ClientContact } from '@/lib/clients'

type JobFormProps = {
  initialData?: Partial<Job>
  onSubmit: (data: Partial<Job>) => Promise<void>
  onDelete?: () => Promise<void>
  submitLabel?: string
}

const JOB_STATUSES = [
  'Inquiry',
  'Quote Sent',
  'Quote Accepted',
  'Was Not Quoted',
  'In Production',
  'Completed',
  'Cancelled',
]

export default function JobForm({
  initialData = {},
  onSubmit,
  onDelete,
  submitLabel = 'Save Job',
}: JobFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientContact | null>(null)

  const [formData, setFormData] = useState<Partial<Job>>({
    client_id: initialData.client_id || '',
    job_number: initialData.job_number || '',
    title: initialData.title || '',
    status: initialData.status || 'Inquiry',
    site_address_line_1: initialData.site_address_line_1 || '',
    site_address_line_2: initialData.site_address_line_2 || '',
    site_suburb: initialData.site_suburb || '',
    site_postcode: initialData.site_postcode || '',
    same_as_client_address: initialData.same_as_client_address ?? false,
    notes: initialData.notes || '',
  })

  useEffect(() => {
    getAllClients().then(setClients)
  }, [])

  // Load contact details whenever the selected client changes
  useEffect(() => {
    if (formData.client_id) {
      getClientContact(formData.client_id).then(setSelectedClient).catch(() => setSelectedClient(null))
    } else {
      setSelectedClient(null)
    }
  }, [formData.client_id])

  const handleChange = (field: keyof Job, value: string | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.client_id) {
      setError('Client is required')
      return
    }

    setIsSubmitting(true)
    try {
      // When "same as client address" is on, store the client's address into the site_* fields
      // so the Job is self-contained even if the client's address changes later
      let dataToSave = { ...formData }
      if (formData.same_as_client_address && selectedClient) {
        dataToSave = {
          ...dataToSave,
          site_address_line_1: selectedClient.address_line_1,
          site_address_line_2: selectedClient.address_line_2,
          site_suburb: selectedClient.suburb,
          site_postcode: selectedClient.postcode,
        }
      }

      const cleanData = Object.fromEntries(
        Object.entries(dataToSave).map(([k, v]) => [k, v === '' ? null : v])
      )
      await onSubmit(cleanData)
      router.push('/jobs')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Delete this job? This cannot be undone.')) return

    setIsSubmitting(true)
    try {
      await onDelete()
      router.push('/jobs')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      setError(message)
      setIsSubmitting(false)
    }
  }

  const isNew = !initialData.id
  const useClientAddress = !!formData.same_as_client_address

  // What addresses to show in the read-only display when same-as-client is on
  const displayAddress = useClientAddress
    ? {
        line1: selectedClient?.address_line_1 || '',
        line2: selectedClient?.address_line_2 || '',
        suburb: selectedClient?.suburb || '',
        postcode: selectedClient?.postcode || '',
      }
    : {
        line1: formData.site_address_line_1 || '',
        line2: formData.site_address_line_2 || '',
        suburb: formData.site_suburb || '',
        postcode: formData.site_postcode || '',
      }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
      {error && (
        <div className="bg-danger-bg border border-danger-border text-danger px-4 py-2.5 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Job basics — 3 column grid */}
      <section className="space-y-3">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Job Details
        </h3>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-6">
            <Field label="Client" required>
              <select
                value={formData.client_id || ''}
                onChange={(e) => handleChange('client_id', e.target.value)}
                className={inputClass}
              >
                <option value="">— Select client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="col-span-3">
            <Field label={isNew ? 'Job Number (auto)' : 'Job Number'}>
              <input
                type="text"
                value={formData.job_number || ''}
                onChange={(e) => handleChange('job_number', e.target.value)}
                className={inputClass}
                placeholder={isNew ? 'Leave blank' : ''}
              />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="Status">
              <select
                value={formData.status || ''}
                onChange={(e) => handleChange('status', e.target.value || null)}
                className={inputClass}
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <Field label="Title">
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            className={inputClass}
            placeholder="Short description of the job"
          />
        </Field>
      </section>

      {/* Client contact — read-only, pulled live */}
      {selectedClient && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
              Client Contact
            </h3>
            <Link
              href={`/clients/${selectedClient.id}`}
              className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text"
            >
              <span>Edit on client</span>
              <ExternalLink size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm bg-surface-muted border border-border rounded-md px-4 py-3">
            <ReadOnlyField label="Phone" value={selectedClient.phone} />
            <ReadOnlyField label="Mobile" value={selectedClient.mobile} />
            <ReadOnlyField label="Email" value={selectedClient.email} />
          </div>
        </section>
      )}

      {/* Site Address — always visible, with checkbox toggling source */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
            Site Address
          </h3>
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={useClientAddress}
              onChange={(e) =>
                handleChange('same_as_client_address', e.target.checked)
              }
            />
            Same as client&apos;s address
          </label>
        </div>

        {useClientAddress ? (
          // Read-only mirror of client's address
          <div className="grid grid-cols-12 gap-3 bg-surface-muted border border-border rounded-md px-4 py-3 text-sm">
            <div className="col-span-12">
              <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-0.5">Address</p>
              <p className="text-text">{displayAddress.line1 || <span className="text-text-faint italic">No address on client</span>}</p>
              {displayAddress.line2 && <p className="text-text-muted">{displayAddress.line2}</p>}
            </div>
            <div className="col-span-8">
              <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-0.5">Suburb</p>
              <p className="text-text">{displayAddress.suburb || '—'}</p>
            </div>
            <div className="col-span-4">
              <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-0.5">Postcode</p>
              <p className="text-text">{displayAddress.postcode || '—'}</p>
            </div>
          </div>
        ) : (
          // Editable
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12">
              <Field label="Street Address">
                <input
                  type="text"
                  value={formData.site_address_line_1 || ''}
                  onChange={(e) => handleChange('site_address_line_1', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="col-span-12">
              <Field label="Address Line 2">
                <input
                  type="text"
                  value={formData.site_address_line_2 || ''}
                  onChange={(e) => handleChange('site_address_line_2', e.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </Field>
            </div>
            <div className="col-span-8">
              <Field label="Suburb">
                <input
                  type="text"
                  value={formData.site_suburb || ''}
                  onChange={(e) => handleChange('site_suburb', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="col-span-4">
              <Field label="Postcode">
                <input
                  type="text"
                  value={formData.site_postcode || ''}
                  onChange={(e) => handleChange('site_postcode', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        )}
      </section>

      {/* Notes */}
      <section className="space-y-2">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Notes
        </h3>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          className={inputClass + ' resize-none'}
          placeholder="Anything worth remembering..."
        />
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="text-sm text-danger hover:opacity-80 disabled:opacity-50"
            >
              Delete job
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
      <span className="block text-xs font-medium text-text-muted mb-1">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </span>
      {children}
    </label>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-0.5">
        {label}
      </p>
      <p className="text-text-muted">{value || '—'}</p>
    </div>
  )
}