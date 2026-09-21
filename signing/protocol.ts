import { z } from 'zod'

export const requestSchema = z.object({
  version: z.literal(1),
  p12: z.string().min(1).max(2 * 1024 * 1024),
  password: z.string().max(4096),
  profile: z.string().min(1).max(4 * 1024 * 1024),
  bundleId: z.string().max(512).nullable().optional(),
  sourceSize: z.number().int().positive().max(4 * 1024 * 1024 * 1024),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/)
}).strict()
export const MAX_HEADER_BYTES = 8 * 1024 * 1024
