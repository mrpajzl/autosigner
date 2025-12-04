import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
})

export default defineEventHandler(async (event) => {
  // Only allow MANAGER (moderator) and SUPERADMIN roles to change password
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const body = await readBody(event)
  const result = schema.safeParse(body)
  
  if (!result.success) {
    throw createError({ 
      statusCode: 400, 
      message: result.error.errors[0]?.message || 'Invalid input'
    })
  }

  const { currentPassword, newPassword } = result.data

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!isCurrentPasswordValid) {
    throw createError({ 
      statusCode: 400, 
      message: 'Current password is incorrect'
    })
  }

  // Hash new password and update
  const newPasswordHash = await bcrypt.hash(newPassword, 12)
  
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash }
  })

  return { success: true, message: 'Password changed successfully' }
})

