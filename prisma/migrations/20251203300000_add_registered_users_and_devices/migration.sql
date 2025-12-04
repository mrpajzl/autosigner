-- CreateTable
CREATE TABLE "RegisteredUser" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "discordName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegisteredUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" TEXT NOT NULL,
    "registeredUserId" TEXT NOT NULL,
    "udid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'IOS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegisteredUser_ownerId_idx" ON "RegisteredUser"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "RegisteredUser_ownerId_discordName_key" ON "RegisteredUser"("ownerId", "discordName");

-- CreateIndex
CREATE INDEX "UserDevice_registeredUserId_idx" ON "UserDevice"("registeredUserId");

-- CreateIndex
CREATE INDEX "UserDevice_udid_idx" ON "UserDevice"("udid");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_registeredUserId_udid_key" ON "UserDevice"("registeredUserId", "udid");

-- AddForeignKey
ALTER TABLE "RegisteredUser" ADD CONSTRAINT "RegisteredUser_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_registeredUserId_fkey" FOREIGN KEY ("registeredUserId") REFERENCES "RegisteredUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

