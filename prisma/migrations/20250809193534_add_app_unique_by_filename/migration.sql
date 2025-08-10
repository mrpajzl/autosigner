/*
  Warnings:

  - Added the required column `ipaFileName` to the `App` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_App" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'IOS',
    "name" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "buildNumber" TEXT,
    "ipaFileName" TEXT,
    "originalIpaPath" TEXT NOT NULL,
    "signedIpaPath" TEXT,
    "manifestPath" TEXT,
    "iconPath" TEXT,
    "sizeBytes" INTEGER,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "App_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_App" ("buildNumber", "bundleId", "iconPath", "id", "manifestPath", "name", "originalIpaPath", "ownerId", "platform", "signedAt", "signedIpaPath", "sizeBytes", "status", "uploadedAt", "version", "ipaFileName") 
SELECT "buildNumber", "bundleId", "iconPath", "id", "manifestPath", "name", "originalIpaPath", "ownerId", "platform", "signedAt", "signedIpaPath", "sizeBytes", "status", "uploadedAt", "version", NULL
FROM "App";
DROP TABLE "App";
ALTER TABLE "new_App" RENAME TO "App";
CREATE INDEX "App_ownerId_idx" ON "App"("ownerId");
CREATE INDEX "App_bundleId_idx" ON "App"("bundleId");
-- No unique index; handle dedupe in application logic
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
