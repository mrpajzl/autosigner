-- CreateTable
CREATE TABLE "SigningJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "payload" TEXT,
    "workflowRunId" INTEGER,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "failureReason" TEXT,
    CONSTRAINT "SigningJob_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SigningJob_token_key" ON "SigningJob"("token");

-- CreateIndex
CREATE INDEX "SigningJob_appId_idx" ON "SigningJob"("appId");




