-- Preserve existing Discord links by populating discordId for all currently linked RegisteredUsers
-- This migration ensures that when we simplify the linking logic to only use discordId,
-- all existing links continue to work without requiring manual re-linking

-- Update RegisteredUser entries that are linked to a Discord user but don't have a discordId
UPDATE "RegisteredUser" 
SET "discordId" = (
  SELECT "discordId" 
  FROM "User" 
  WHERE "User"."id" = "RegisteredUser"."linkedUserId"
)
WHERE "linkedUserId" IS NOT NULL 
  AND "discordId" IS NULL
  AND EXISTS (
    SELECT 1 
    FROM "User" 
    WHERE "User"."id" = "RegisteredUser"."linkedUserId" 
      AND "User"."discordId" IS NOT NULL
  );
