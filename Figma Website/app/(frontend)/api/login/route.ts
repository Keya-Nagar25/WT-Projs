import { appAuth } from '@/lib/app-auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 })
    }
    return NextResponse.json({ user: await appAuth.login(email.trim().toLowerCase(), password) })
  } catch {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 })
  }
}
