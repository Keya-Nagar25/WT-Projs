import { appAuth } from '@/lib/app-auth'
import { NextResponse } from 'next/server'

export async function POST() {
  await appAuth.logout()
  return NextResponse.json({ ok: true })
}
