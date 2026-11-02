import { appAuth } from '@/lib/app-auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Complete all fields.' }, { status: 400 })
    }
    if (!name.trim() || !email.includes('@') || password.length < 8) {
      return NextResponse.json({ error: 'Use a valid email and a password of at least 8 characters.' }, { status: 400 })
    }
    return NextResponse.json({ user: await appAuth.signup(name.trim(), email.trim().toLowerCase(), password) })
  } catch {
    return NextResponse.json({ error: 'An account with this email may already exist.' }, { status: 409 })
  }
}
