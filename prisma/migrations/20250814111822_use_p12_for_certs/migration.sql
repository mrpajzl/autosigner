/*
  Warnings:

  - You are about to drop the column `certificatePem` on the `Certificate` table. All the data in the column will be lost.
  - You are about to drop the column `privateKeyPem` on the `Certificate` table. All the data in the column will be lost.
  - Added the required column `p12Data` to the `Certificate` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "p12Data" BLOB NOT NULL,
    "p12PasswordEnc" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Certificate" ("active", "createdAt", "displayName", "id", "userId") SELECT "active", "createdAt", "displayName", "id", "userId" FROM "Certificate";
DROP TABLE "Certificate";
ALTER TABLE "new_Certificate" RENAME TO "Certificate";
CREATE INDEX "Certificate_userId_active_idx" ON "Certificate"("userId", "active");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
