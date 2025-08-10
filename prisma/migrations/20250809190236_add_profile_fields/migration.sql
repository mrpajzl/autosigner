/*
  Warnings:

  - You are about to drop the column `mobileprovision` on the `ManagerProfile` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ManagerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "companyName" TEXT,
    "certificatePem" TEXT,
    "privateKeyPem" TEXT,
    "p12PasswordEnc" TEXT,
    "mobileprovisionIos" BLOB,
    "mobileprovisionTvos" BLOB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManagerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ManagerProfile" ("certificatePem", "companyName", "createdAt", "displayName", "id", "privateKeyPem", "userId") SELECT "certificatePem", "companyName", "createdAt", "displayName", "id", "privateKeyPem", "userId" FROM "ManagerProfile";
DROP TABLE "ManagerProfile";
ALTER TABLE "new_ManagerProfile" RENAME TO "ManagerProfile";
CREATE UNIQUE INDEX "ManagerProfile_userId_key" ON "ManagerProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
