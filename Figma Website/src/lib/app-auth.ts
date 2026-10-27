import 'server-only'

import config from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

const COOKIE_NAME = 'app-session'

export function createAppAuth(collection: 'users') {
  async function setSession(token: string) {
    const store = await cookies()
    store.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  return {
    async currentUser() {
      const token = (await cookies()).get(COOKIE_NAME)?.value
      if (!token) return null

      const payload = await getPayload({ config })
      const authHeaders = new Headers({ Authorization: `JWT ${token}` })
      const { user } = await payload.auth({ headers: authHeaders })
      if (!user || user.collection !== collection) return null
      return { id: String(user.id), email: user.email, name: user.name as string }
    },

    async login(email: string, password: string) {
      const payload = await getPayload({ config })
      const result = await payload.login({
        collection,
        data: { email, password },
      })
      if (!result.token || !result.user) throw new Error('Unable to create a session.')
      await setSession(result.token)
      return { id: String(result.user.id), email: result.user.email, name: result.user.name as string }
    },

    async signup(name: string, email: string, password: string) {
      const payload = await getPayload({ config })
      await payload.create({
        collection,
        data: { name, email, password },
        overrideAccess: false,
      })
      return this.login(email, password)
    },

    async logout() {
      const store = await cookies()
      store.delete(COOKIE_NAME)
    },
  }
}

export const appAuth = createAppAuth('users')
