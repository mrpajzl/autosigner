-- Step 1: Set deviceNumber to negative values temporarily to avoid constraint conflicts
UPDATE "UserDevice" SET "deviceNumber" = -"deviceNumber";

-- Step 2: Drop the old unique constraint on (registeredUserId, deviceNumber)
DROP INDEX IF EXISTS "UserDevice_registeredUserId_deviceNumber_key";

-- Step 3: Renumber devices per user per platform
-- This will assign sequential numbers (1, 2, 3...) to each user's devices grouped by platform
WITH numbered_devices AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY "registeredUserId", platform ORDER BY "createdAt") as new_device_num
  FROM "UserDevice"
)
UPDATE "UserDevice"
SET "deviceNumber" = numbered_devices.new_device_num
FROM numbered_devices
WHERE "UserDevice".id = numbered_devices.id;

-- Step 4: Add the new unique constraint on (registeredUserId, platform, deviceNumber)
CREATE UNIQUE INDEX "UserDevice_registeredUserId_platform_deviceNumber_key" ON "UserDevice"("registeredUserId", "platform", "deviceNumber");
