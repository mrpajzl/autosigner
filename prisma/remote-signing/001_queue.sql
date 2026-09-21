-- Additive PostgreSQL migration. Never run the historical SQLite migrations on production.
CREATE TABLE IF NOT EXISTS "RemoteSigningJob" (
  "id" TEXT PRIMARY KEY,
  "targetKey" TEXT NOT NULL,
  "appId" TEXT NOT NULL REFERENCES "App"("id") ON DELETE CASCADE,
  "signerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "signedVersionId" TEXT REFERENCES "SignedVersion"("id") ON DELETE CASCADE,
  "jobType" TEXT NOT NULL CHECK ("jobType" IN ('owner', 'user')),
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'running', 'completed', 'failed')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "availableAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "leaseUntil" TIMESTAMPTZ,
  "leaseToken" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "RemoteSigningJob_active_target" ON "RemoteSigningJob"("targetKey") WHERE "status" IN ('pending', 'running');
CREATE UNIQUE INDEX IF NOT EXISTS "RemoteSigningJob_one_running" ON "RemoteSigningJob"("status") WHERE "status" = 'running';
CREATE INDEX IF NOT EXISTS "RemoteSigningJob_pending" ON "RemoteSigningJob"("availableAt", "createdAt") WHERE "status" = 'pending';
