-- CreateTable
CREATE TABLE "SignedVersion" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signedIpaPath" TEXT,
    "manifestPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignedVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignedVersion_appId_idx" ON "SignedVersion"("appId");

-- CreateIndex
CREATE INDEX "SignedVersion_signerId_idx" ON "SignedVersion"("signerId");

-- CreateIndex
CREATE UNIQUE INDEX "SignedVersion_appId_signerId_key" ON "SignedVersion"("appId", "signerId");

-- AddForeignKey
ALTER TABLE "SignedVersion" ADD CONSTRAINT "SignedVersion_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignedVersion" ADD CONSTRAINT "SignedVersion_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



