'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [sessionOk, setSessionOk] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Supabase sometimes delivers the session via URL hash (implicit flow)
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const accessToken  = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error: e }) => {
            setSessionOk(!e)
            setChecking(false)
          })
        return
      }
    }

    // Cookie-based session set by /auth/confirm
    supabase.auth.getSession().then(({ data }) => {
      setSessionOk(!!data.session)
      setChecking(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm)  { setError('Passwords do not match'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateErr } = await supabase.auth.updateUser({ password })

    if (updateErr) {
      setError(updateErr.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-text-muted text-sm">Verifying link…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-text tracking-tight">RHK</h1>
          <p className="text-sm text-text-muted mt-1">Operations console</p>
        </div>

        <div className="bg-surface border border-border rounded-xl shadow-sm p-8">
          <h2 className="text-base font-semibold text-text mb-1">Set your password</h2>
          <p className="text-xs text-text-muted mb-6">Choose a password to complete your account setup.</p>

          {!sessionOk ? (
            <div className="bg-danger-bg border border-danger-border text-danger px-3 py-3 rounded-md text-sm">
              <p className="font-medium mb-1">This link has expired or already been used.</p>
              <p className="text-xs opacity-80">Please ask for a new invite to be sent to your email address.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-danger-bg border border-danger-border text-danger px-3 py-2.5 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-medium bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {loading ? 'Setting password…' : 'Set password & continue'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-text-faint mt-6">
          Resident Hero CRM · Staff access only
        </p>
      </div>
    </div>
  )
}
