'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Forgot password state
  const [showForgot, setShowForgot]     = useState(false)
  const [forgotEmail, setForgotEmail]   = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent]     = useState(false)
  const [forgotError, setForgotError]   = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotError(null)
    setForgotLoading(true)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/confirm`
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), { redirectTo })

    setForgotLoading(false)
    if (error) {
      setForgotError(error.message)
    } else {
      setForgotSent(true)
    }
  }

  if (showForgot) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-text tracking-tight">RHK</h1>
            <p className="text-sm text-text-muted mt-1">Operations console</p>
          </div>

          <div className="bg-surface border border-border rounded-xl shadow-sm p-8">
            <h2 className="text-base font-semibold text-text mb-1">Reset password</h2>
            <p className="text-xs text-text-muted mb-6">Enter your email and we'll send you a reset link.</p>

            {forgotSent ? (
              <div className="space-y-4">
                <div className="bg-success-bg border border-success-border text-success px-3 py-2.5 rounded-md text-sm">
                  Password reset email sent — check your inbox.
                </div>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail('') }}
                  className="w-full py-2.5 text-sm text-text-muted hover:text-text border border-border rounded-md hover:bg-surface-hover transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                {forgotError && (
                  <div className="bg-danger-bg border border-danger-border text-danger px-3 py-2.5 rounded-md text-sm">
                    {forgotError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="you@residenthero.com.au"
                    className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 text-sm font-medium bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {forgotLoading ? 'Sending…' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="w-full py-2 text-xs text-text-muted hover:text-text transition-colors"
                >
                  Back to sign in
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

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-text tracking-tight">RHK</h1>
          <p className="text-sm text-text-muted mt-1">Operations console</p>
        </div>

        <div className="bg-surface border border-border rounded-xl shadow-sm p-8">
          <h2 className="text-base font-semibold text-text mb-6">Sign in</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-danger-bg border border-danger-border text-danger px-3 py-2.5 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="you@residenthero.com.au"
                className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setShowForgot(true); setForgotEmail(email) }}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-text-faint mt-6">
          Resident Hero CRM · Staff access only
        </p>
      </div>
    </div>
  )
}
