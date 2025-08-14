import { PrismaClient } from '@prisma/client'

// Ensure DATABASE_URL is set for Prisma (default to repo SQLite file if not provided)
// Use a relative URL so it works in local dev without container paths
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db'
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const baseLogs: ('query' | 'info' | 'warn' | 'error')[] = ['error', 'warn']
const envLog = (process.env.PRISMA_LOG_LEVEL || '').toLowerCase()
if (envLog.includes('info') && !baseLogs.includes('info')) baseLogs.push('info')
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: baseLogs
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


