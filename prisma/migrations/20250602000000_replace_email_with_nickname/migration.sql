-- Replace email field with nickname field
-- This migration renames the email column to nickname

-- Rename the column
ALTER TABLE "User" RENAME COLUMN "email" TO "nickname";

-- Update default status from PENDING to APPROVED (since superadmin creates all users now)
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'APPROVED';




