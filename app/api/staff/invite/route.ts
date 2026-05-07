import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { staffId, email } = await req.json()

    if (!staffId || !email) {
      return NextResponse.json({ error: 'staffId and email are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email)

    let authUserId: string

    if (error) {
      if (error.message?.toLowerCase().includes('already been registered')) {
        // User exists — look them up and link
        const { data: listData, error: listError } = await admin.auth.admin.listUsers()
        if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })
        const existing = listData.users.find((u) => u.email === email)
        if (!existing) return NextResponse.json({ error: 'User exists but could not be found' }, { status: 500 })
        authUserId = existing.id
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      authUserId = data.user.id
    }

    const { error: updateError } = await admin
      .from('staff')
      .update({ user_id: authUserId })
      .eq('id', staffId)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
