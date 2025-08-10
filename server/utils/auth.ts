import { prisma } from './db'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { H3Event, getCookie, setCookie, deleteCookie } from 'h3'

const SESSION_COOKIE = 'as_session'

export async function registerUser(email: string, password: string, role: 'SUPERADMIN' | 'MANAGER' = 'MANAGER') {
  const passwordHash = await bcrypt.hash(password, 12)
  return prisma.user.create({ data: { email, passwordHash, role, status: role === 'SUPERADMIN' ? 'APPROVED' : 'PENDING' } })
}

export async function login(event: H3Event, email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw createError({ statusCode: 401, message: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw createError({ statusCode: 401, message: 'Invalid credentials' })
  if (user.status !== 'APPROVED') throw createError({ statusCode: 403, message: 'Account not approved' })
  const token = nanoid(40)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
  await prisma.session.create({ data: { userId: user.id, token, expiresAt } })
  // Use secure cookies only in production; allow HTTP cookies in dev
  const isProd = process.env.NODE_ENV === 'production'
  setCookie(event, SESSION_COOKIE, token, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 })
  return user
}

export async function getSessionUser(event: H3Event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session || session.expiresAt < new Date()) return null
  return session.user
}

export async function requireUser(event: H3Event) {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })
  return user
}

export async function requireRole(event: H3Event, role: 'SUPERADMIN' | 'MANAGER') {
  const user = await requireUser(event)
  if (user.role !== role) throw createError({ statusCode: 403, message: 'Forbidden' })
  return user
}

export async function signOut(event: H3Event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) {
    await prisma.session.deleteMany({ where: { token } })
  }
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}


