import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')           // PKCE flow
  const token_hash = searchParams.get('token_hash') // Email OTP flow
  const type = searchParams.get('type')

  // Capture cookies that Supabase wants to set so we can put them on the redirect response
  const cookiesToForward: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookies) { cookiesToForward.push(...cookies) },
      },
    }
  )

  let verifyError: Error | null = null
  let dest = `${origin}/dashboard`

  if (code) {
    // PKCE: Supabase redirected back with ?code=
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    verifyError = error
    dest = `${origin}/auth/set-password`
  } else if (token_hash && type) {
    // Email OTP: token_hash + type in URL
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'invite' | 'recovery' | 'email' | 'signup' | 'magiclink',
    })
    verifyError = error
    if (!error) {
      dest = (type === 'invite' || type === 'recovery')
        ? `${origin}/auth/set-password`
        : `${origin}/dashboard`
    }
  } else {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`)
  }

  if (verifyError) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`)
  }

  // Build the redirect and attach the session cookies to it
  const response = NextResponse.redirect(dest)
  cookiesToForward.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  )
  return response
}
