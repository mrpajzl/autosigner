-- CreateTable
CREATE TABLE "AppleDeveloperCredentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "privateKeyEnc" TEXT NOT NULL,
    "teamName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppleDeveloperCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppleDeveloperCredentials_userId_key" ON "AppleDeveloperCredentials"("userId");

-- AddForeignKey
ALTER TABLE "AppleDeveloperCredentials" ADD CONSTRAINT "AppleDeveloperCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


