import assert from 'node:assert/strict'
import { planOrphanedUploadCleanup, type UploadCleanupDbState, type UploadObject } from '../server/utils/storage-cleanup-plan.ts'

const objects: UploadObject[] = [
  { key: 'uploads/user-1/app-live/signed.ipa' },
  { key: 'uploads/user-1/app-live/manifest.plist' },
  { key: 'uploads/user-1/original-live.ipa' },
  { key: 'uploads/user-1/original-old.ipa' },
  { key: 'uploads/user-1/sv-live/signed-by-user.ipa' },
  { key: 'uploads/user-1/sv-orphan/signed-by-old-user.ipa' },
  { key: 'uploads/user-1/icons/live.png' },
  { key: 'uploads/user-1/icons/old.png' },
  { key: 'uploads/deleted-user/app-old/signed.ipa' },
  { key: 'uploads/deleted-user/original.ipa' },
]

const state: UploadCleanupDbState = {
  users: [{ id: 'user-1' }],
  apps: [
    {
      id: 'app-live',
      ownerId: 'user-1',
      ipaFileName: 'original-live.ipa',
      originalIpaPath: '/uploads/user-1/original-live.ipa',
      signedIpaPath: '/uploads/user-1/app-live/signed.ipa',
      manifestPath: '/uploads/user-1/app-live/manifest.plist',
      iconPath: '/uploads/user-1/icons/live.png',
    },
  ],
  signedVersions: [
    {
      id: 'sv-live',
      signerId: 'user-1',
      signedIpaPath: '/uploads/user-1/sv-live/signed-by-user.ipa',
      manifestPath: null,
    },
  ],
}

const cleanup = planOrphanedUploadCleanup(objects, state)

assert.deepEqual(cleanup.deletePrefixes.sort(), [
  'uploads/deleted-user',
  'uploads/user-1/icons/old.png',
  'uploads/user-1/original-old.ipa',
  'uploads/user-1/sv-orphan',
].sort())

assert.equal(cleanup.kept, 5)
assert.equal(cleanup.totalCleaned, 4)

console.log('storage cleanup planner ok')
