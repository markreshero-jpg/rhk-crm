'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Mail, UserCheck, UserX } from 'lucide-react'
import { Staff, EMPLOYMENT_TYPES, getStaff, createStaff, updateStaff, deleteStaff } from '@/lib/staff'
import { createClient } from '@/lib/supabase-browser'
import StaffActivityPanel from '@/components/StaffActivityPanel'

type Tab = 'staff' | 'activity'

const COLOURS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#6366F1',
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StaffSettingsPage() {
  const [tab, setTab] = useState<Tab>('staff')
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const load = useCallback(async () => {
    const data = await getStaff()
    setStaff(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = showInactive ? staff : staff.filter((s) => s.is_active)
  const selected = staff.find((s) => s.id === selectedId) ?? null

  async function handleCreate(data: Partial<Staff>) {
    const created = await createStaff({
      first_name: data.first_name || '',
      last_name: data.last_name ?? null,
      display_name: data.display_name || data.first_name || '',
      role: data.role ?? null,
      employment_type: data.employment_type ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      colour: data.colour ?? COLOURS[0],
      notes: data.notes ?? null,
      is_active: true,
      user_id: null,
    })
    setShowNew(false)
    await load()
    setSelectedId(created.id)
  }

  async function handleUpdate(id: string, patch: Partial<Staff>) {
    await updateStaff(id, patch)
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this staff member? This cannot be undone.')) return
    await deleteStaff(id)
    if (selectedId === id) setSelectedId(null)
    await load()
  }

  return (
    <div className="p-10 max-w-[1200px]">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Settings</p>
        <h2 className="text-4xl font-medium text-text tracking-tight">Staff</h2>
        <p className="text-text-muted mt-2 text-sm">Manage staff members, roles and system access.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-border">
        {(['staff', 'activity'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t === 'activity' ? 'Activity' : 'Staff'}
          </button>
        ))}
      </div>

      {tab === 'activity' && <StaffActivityPanel />}

      {tab === 'staff' && <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <button onClick={() => { setShowNew(true); setSelectedId(null) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent-text bg-accent rounded-md hover:bg-accent-hover mb-3">
            <Plus size={12} /> New Staff Member
          </button>

          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
              {showInactive ? 'All staff' : 'Active staff'}
            </span>
            <button onClick={() => setShowInactive((v) => !v)}
              className="text-[10px] text-text-muted hover:text-text transition-colors">
              {showInactive ? 'Hide inactive' : 'Show inactive'}
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-text-subtle px-2 py-3">Loading…</p>
          ) : (
            <ul className="space-y-1">
              {visible.length === 0 && (
                <li className="text-xs text-text-faint italic px-2 py-3">No staff yet.</li>
              )}
              {visible.map((s) => {
                const isSel = selectedId === s.id
                return (
                  <li key={s.id}>
                    <button onClick={() => { setSelectedId(s.id); setShowNew(false) }}
                      className={`w-full text-left px-3 py-2.5 rounded-md transition-colors flex items-center gap-2.5 ${isSel ? 'bg-accent text-accent-text' : 'hover:bg-surface-hover text-text'}`}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: s.colour || '#94a3b8' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{s.display_name}</div>
                        <div className={`text-[11px] truncate ${isSel ? 'text-accent-text/70' : 'text-text-muted'}`}>
                          {s.role || s.employment_type || 'Staff'}
                          {!s.is_active && <span className="ml-1 opacity-60">· Inactive</span>}
                        </div>
                      </div>
                      {s.user_id && (
                        <UserCheck size={12} className={isSel ? 'text-accent-text/60' : 'text-success shrink-0'} />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {showNew ? (
            <StaffForm
              onSubmit={handleCreate}
              onCancel={() => setShowNew(false)}
              submitLabel="Create Staff Member"
            />
          ) : selected ? (
            <StaffDetail
              key={selected.id}
              staff={selected}
              onUpdate={(patch) => handleUpdate(selected.id, patch)}
              onDelete={() => handleDelete(selected.id)}
              onRefresh={load}
            />
          ) : (
            <div className="text-center py-16 text-text-subtle text-sm">
              Select a staff member or create a new one.
            </div>
          )}
        </div>
      </div>}
    </div>
  )
}

// ── Staff Detail ──────────────────────────────────────────────────────────────

function StaffDetail({ staff, onUpdate, onDelete, onRefresh }: {
  staff: Staff
  onUpdate: (patch: Partial<Staff>) => Promise<void>
  onDelete: () => void
  onRefresh: () => Promise<void>
}) {
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  async function handleInvite() {
    if (!staff.email) { setInviteMsg('Add an email address first.'); return }
    setInviting(true); setInviteMsg(null)
    try {
      const res = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: staff.id, email: staff.email }),
      })
      const d = await res.json()
      if (!res.ok) { setInviteMsg(d.error || 'Failed to send invite'); return }
      setInviteMsg('Invite sent! They will receive an email to set their password.')
      await onRefresh()
    } catch {
      setInviteMsg('Network error — please try again.')
    } finally {
      setInviting(false)
    }
  }

  async function handleResendInvite() {
    if (!staff.email) { setInviteMsg('No email address on file.'); return }
    setInviting(true); setInviteMsg(null)
    try {
      const res = await fetch('/api/staff/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staff.email }),
      })
      const d = await res.json()
      if (!res.ok) { setInviteMsg(d.error || 'Failed to resend invite'); return }
      setInviteMsg('Invite resent! They will receive an email to set their password.')
    } catch {
      setInviteMsg('Network error — please try again.')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-black/10 shrink-0"
            style={{ backgroundColor: staff.colour || '#94a3b8' }} />
          <div>
            <h3 className="text-lg font-semibold text-text">{staff.display_name}</h3>
            <p className="text-sm text-text-muted">{staff.role || 'No role set'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onUpdate({ is_active: !staff.is_active })}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors ${staff.is_active ? 'bg-success-bg text-success border-success-border hover:opacity-80' : 'bg-surface-muted text-text-muted border-border hover:bg-surface-hover'}`}>
            {staff.is_active ? <><UserCheck size={12} /> Active</> : <><UserX size={12} /> Inactive</>}
          </button>
          <button onClick={onDelete} className="text-xs text-danger hover:opacity-80 px-2 py-1.5">Delete</button>
        </div>
      </div>

      {/* Access card */}
      <div className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg border ${staff.user_id ? 'bg-success-bg border-success-border' : 'bg-surface-muted border-border'}`}>
        <div className="flex items-center gap-2.5">
          {staff.user_id
            ? <UserCheck size={15} className="text-success shrink-0" />
            : <UserX size={15} className="text-text-subtle shrink-0" />}
          <div>
            <p className={`text-sm font-medium ${staff.user_id ? 'text-success' : 'text-text-muted'}`}>
              {staff.user_id ? 'Can log in' : 'No login access'}
            </p>
            <p className="text-xs text-text-subtle">
              {staff.user_id ? 'Supabase auth account linked' : 'Send an invite to give them access'}
            </p>
          </div>
        </div>
        {staff.user_id ? (
          <button onClick={handleResendInvite} disabled={inviting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface text-text-muted border border-border rounded-md hover:bg-surface-hover disabled:opacity-50 transition-colors shrink-0">
            <Mail size={12} /> {inviting ? 'Sending…' : 'Resend Invite'}
          </button>
        ) : (
          <button onClick={handleInvite} disabled={inviting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors shrink-0">
            <Mail size={12} /> {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        )}
      </div>
      {inviteMsg && (
        <p className={`text-xs px-1 ${inviteMsg.startsWith('Invite sent') ? 'text-success' : 'text-danger'}`}>
          {inviteMsg}
        </p>
      )}

      {/* Form */}
      <StaffForm
        initialData={staff}
        onSubmit={async (data) => { await onUpdate(data); }}
        submitLabel="Save Changes"
      />
    </div>
  )
}

// ── Staff Form ────────────────────────────────────────────────────────────────

function StaffForm({ initialData, onSubmit, onCancel, submitLabel = 'Save' }: {
  initialData?: Partial<Staff>
  onSubmit: (data: Partial<Staff>) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}) {
  const [form, setForm] = useState<Partial<Staff>>({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    display_name: initialData?.display_name || '',
    role: initialData?.role || '',
    employment_type: initialData?.employment_type || null,
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    colour: initialData?.colour || COLOURS[0],
    notes: initialData?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof Staff, value: string | null) {
    setForm((p) => ({ ...p, [field]: value || null }))
    if (field === 'first_name' || field === 'last_name') {
      const first = field === 'first_name' ? (value || '') : (form.first_name || '')
      const last = field === 'last_name' ? (value || '') : (form.last_name || '')
      if (!initialData?.display_name) {
        setForm((p) => ({ ...p, [field]: value || null, display_name: `${first} ${last}`.trim() }))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name?.trim()) { setError('First name is required'); return }
    if (!form.display_name?.trim()) { setError('Display name is required'); return }
    setSaving(true); setError(null)
    try {
      await onSubmit(form)
    } catch (err) {
      setError((err as Error).message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {error && (
        <div className="bg-danger-bg border border-danger-border text-danger px-3 py-2.5 rounded-md text-sm">{error}</div>
      )}

      <section className="space-y-4">
        <h3 className={sectionHeading}>Personal Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required>
            <input type="text" value={form.first_name || ''} onChange={(e) => set('first_name', e.target.value)} className={inputCls} autoFocus />
          </Field>
          <Field label="Last Name">
            <input type="text" value={form.last_name || ''} onChange={(e) => set('last_name', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Display Name" required>
          <input type="text" value={form.display_name || ''} onChange={(e) => set('display_name', e.target.value)} className={inputCls} placeholder="How their name appears in the system" />
        </Field>
      </section>

      <section className="space-y-4">
        <h3 className={sectionHeading}>Role & Employment</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role / Job Title">
            <input type="text" value={form.role || ''} onChange={(e) => set('role', e.target.value)} className={inputCls} placeholder="e.g. Installer, Project Manager" />
          </Field>
          <Field label="Employment Type">
            <select value={form.employment_type || ''} onChange={(e) => setForm((p) => ({ ...p, employment_type: (e.target.value as typeof EMPLOYMENT_TYPES[number]) || null }))} className={inputCls}>
              <option value="">Select…</option>
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className={sectionHeading}>Contact</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input type="tel" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} className={inputCls} placeholder="Used for login invite" />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className={sectionHeading}>Calendar Colour</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {COLOURS.map((c) => (
            <button key={c} type="button" onClick={() => setForm((p) => ({ ...p, colour: c }))}
              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${form.colour === c ? 'border-text scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className={sectionHeading}>Notes</h3>
        <Field label="Notes">
          <textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={3} className={inputCls + ' resize-none w-full'} placeholder="Anything worth noting…" />
        </Field>
      </section>

      <div className="flex items-center gap-2 pt-2">
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50">
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm text-text-muted border border-border rounded-md hover:bg-surface-hover">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-text-muted mb-1.5">
        {label}{required && <span className="text-danger ml-1">*</span>}
      </span>
      {children}
    </label>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border'
const sectionHeading = 'text-[10px] uppercase tracking-widest text-text-subtle font-medium'
