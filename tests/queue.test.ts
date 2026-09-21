import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../server/utils/db'
import { signingQueue } from '../server/utils/signing-queue'
import { SignerUnavailableError } from '../signing/ssh-client'

// This suite only runs against an explicitly named disposable restore-check database.
test('durable queue survives restart, deduplicates, serializes workers and recovers offline/expired jobs', async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.includes('restorecheck')) throw new Error('Use a disposable restorecheck database')
  process.env.SIGNING_QUEUE_ENABLED = 'false'
  const Queue = signingQueue.constructor as any
  const first = new Queue(), second = new Queue()
  let active = 0, maxActive = 0, calls = 0, unavailable = false
  ;(globalThis as any).__testSign = async () => {
    if (unavailable) throw new SignerUnavailableError('offline')
    active++; calls++; maxActive = Math.max(maxActive, active)
    await new Promise(resolve => setTimeout(resolve, 30))
    active--
  }
  try {
    await prisma.$executeRaw`DELETE FROM "RemoteSigningJob"`
    const apps = await prisma.app.findMany({ take: 2 })
    assert.equal(apps.length, 2)
    const [a,b] = await Promise.all([first.enqueueOwnerSigning(apps[0].id, apps[0].ownerId), second.enqueueOwnerSigning(apps[0].id, apps[0].ownerId)])
    assert.equal(a.id,b.id)
    assert.equal((await new Queue().getStatus()).queueLength,1)
    await second.enqueueOwnerSigning(apps[1].id,apps[1].ownerId)
    await Promise.all([first.processNext(),second.processNext()])
    assert.equal(calls,1)
    await second.processNext()
    assert.equal(calls,2);assert.equal(maxActive,1)
    unavailable=true
    const job=await first.enqueueOwnerSigning(apps[0].id,apps[0].ownerId)
    await first.processNext()
    assert.equal((await second.getStatus()).queueLength,1)
    await second.processNext();assert.equal(calls,2)
    unavailable=false
    await prisma.$executeRaw`UPDATE "RemoteSigningJob" SET "status"='running', "leaseUntil"=now()-interval '1 second' WHERE "id"=${job.id}`
    await prisma.$executeRaw`UPDATE "RemoteSigningJob" SET "availableAt"=now() WHERE "id"=${job.id}`
    await second.processNext();assert.equal(calls,3)
    assert.equal((await first.getStatus()).queueLength,0)
  } finally { await prisma.$executeRaw`DELETE FROM "RemoteSigningJob"`; await prisma.$disconnect() }
})
