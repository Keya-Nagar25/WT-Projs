import { appAuth } from '@/lib/app-auth'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ user: await appAuth.currentUser() })
}
