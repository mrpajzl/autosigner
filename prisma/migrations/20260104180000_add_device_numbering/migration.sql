-- AlterTable: Add new columns to UserDevice
ALTER TABLE "UserDevice" ADD COLUMN "deviceNumber" INTEGER;
ALTER TABLE "UserDevice" ADD COLUMN "appleDeviceId" TEXT;

-- Populate deviceNumber for existing devices
-- This assigns sequential numbers (1, 2, 3...) to each user's devices based on creation order
WITH numbered_devices AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY "registeredUserId" ORDER BY "createdAt") as device_num
  FROM "UserDevice"
)
UPDATE "UserDevice"
SET "deviceNumber" = numbered_devices.device_num
FROM numbered_devices
WHERE "UserDevice".id = numbered_devices.id;

-- Now make deviceNumber NOT NULL
ALTER TABLE "UserDevice" ALTER COLUMN "deviceNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_registeredUserId_deviceNumber_key" ON "UserDevice"("registeredUserId", "deviceNumber");
