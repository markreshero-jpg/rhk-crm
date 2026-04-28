'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Job } from '@/lib/jobs'
import { getAllClients, Client } from '@/lib/clients'

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

  const handleChange = (
    field: keyof Job,
    value: string | boolean | null
  ) => {
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
      const cleanData = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [k, v === '' ? null : v])
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && (
        <div className="bg-danger-bg border border-danger-border text-danger px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Job Details
        </h3>

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

        <div className="grid grid-cols-2 gap-4">
          <Field
            label={isNew ? 'Job Number (auto-generated if blank)' : 'Job Number'}
          >
            <input
              type="text"
              value={formData.job_number || ''}
              onChange={(e) => handleChange('job_number', e.target.value)}
              className={inputClass}
              placeholder={isNew ? 'Leave blank to auto-generate' : ''}
            />
          </Field>

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

      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Site Address
        </h3>

        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={formData.same_as_client_address || false}
            onChange={(e) =>
              handleChange('same_as_client_address', e.target.checked)
            }
          />
          Same as client&apos;s address
        </label>

        {!formData.same_as_client_address && (
          <>
            <Field label="Street Address">
              <input
                type="text"
                value={formData.site_address_line_1 || ''}
                onChange={(e) =>
                  handleChange('site_address_line_1', e.target.value)
                }
                className={inputClass}
              />
            </Field>

            <Field label="Address Line 2">
              <input
                type="text"
                value={formData.site_address_line_2 || ''}
                onChange={(e) =>
                  handleChange('site_address_line_2', e.target.value)
                }
                className={inputClass}
                placeholder="Optional"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Suburb">
                <input
                  type="text"
                  value={formData.site_suburb || ''}
                  onChange={(e) => handleChange('site_suburb', e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Postcode">
                <input
                  type="text"
                  value={formData.site_postcode || ''}
                  onChange={(e) =>
                    handleChange('site_postcode', e.target.value)
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </>
        )}
      </section>

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
      <span className="block text-xs font-medium text-text-muted mb-1.5">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </span>
      {children}
    </label>
  )
}