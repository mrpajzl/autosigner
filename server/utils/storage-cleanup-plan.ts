export interface UploadObject {
  key: string
}

export interface UploadCleanupDbState {
  users: Array<{ id: string }>
  apps: Array<{
    id: string
    ownerId: string
    ipaFileName?: string | null
    originalIpaPath?: string | null
    signedIpaPath?: string | null
    manifestPath?: string | null
    iconPath?: string | null
  }>
  signedVersions: Array<{
    id: string
    signerId: string
    signedIpaPath?: string | null
    manifestPath?: string | null
  }>
}

export interface UploadCleanupPlan {
  deletePrefixes: string[]
  kept: number
  totalCleaned: number
}

function normalizeKey(key: string): string {
  const trimmed = (key || '').trim()
  const withoutPrefix = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
  return withoutPrefix
    .replace(/\\/g, '/')
    .split('/')
    .filter(part => part && part !== '.')
    .reduce<string[]>((parts, part) => {
      if (part === '..') {
        parts.pop()
      } else {
        parts.push(part)
      }
      return parts
    }, [])
    .join('/')
}

function addReferencedPath(paths: Set<string>, publicPath?: string | null): void {
  if (!publicPath) return
  const normalized = normalizeKey(publicPath)
  if (normalized.startsWith('uploads/')) {
    paths.add(normalized)
  }
}

function addDeletePrefix(prefixes: Set<string>, prefix: string): void {
  const normalized = normalizeKey(prefix).replace(/\/+$/, '')
  if (normalized && normalized.startsWith('uploads/')) {
    prefixes.add(normalized)
  }
}

export function planOrphanedUploadCleanup(objects: UploadObject[], state: UploadCleanupDbState): UploadCleanupPlan {
  const userIds = new Set(state.users.map(user => user.id))
  const validAppDirsByOwner = new Map<string, Set<string>>()
  const validSignedVersionDirsBySigner = new Map<string, Set<string>>()
  const referencedPaths = new Set<string>()
  const referencedIpaNamesByOwner = new Map<string, Set<string>>()

  for (const app of state.apps) {
    if (!validAppDirsByOwner.has(app.ownerId)) {
      validAppDirsByOwner.set(app.ownerId, new Set())
    }
    if (!referencedIpaNamesByOwner.has(app.ownerId)) {
      referencedIpaNamesByOwner.set(app.ownerId, new Set())
    }
    validAppDirsByOwner.get(app.ownerId)!.add(app.id)
    if (app.ipaFileName) {
      referencedIpaNamesByOwner.get(app.ownerId)!.add(app.ipaFileName)
    }
    addReferencedPath(referencedPaths, app.originalIpaPath)
    addReferencedPath(referencedPaths, app.signedIpaPath)
    addReferencedPath(referencedPaths, app.manifestPath)
    addReferencedPath(referencedPaths, app.iconPath)
  }

  for (const signedVersion of state.signedVersions) {
    if (!validSignedVersionDirsBySigner.has(signedVersion.signerId)) {
      validSignedVersionDirsBySigner.set(signedVersion.signerId, new Set())
    }
    validSignedVersionDirsBySigner.get(signedVersion.signerId)!.add(signedVersion.id)
    addReferencedPath(referencedPaths, signedVersion.signedIpaPath)
    addReferencedPath(referencedPaths, signedVersion.manifestPath)
  }

  const deletePrefixes = new Set<string>()
  let kept = 0

  for (const object of objects) {
    const key = normalizeKey(object.key)
    if (!key.startsWith('uploads/')) continue

    const parts = key.split('/').filter(Boolean)
    const userId = parts[1]
    const firstChild = parts[2]
    if (!userId || !firstChild) continue

    if (!userIds.has(userId)) {
      addDeletePrefix(deletePrefixes, `uploads/${userId}`)
      continue
    }

    if (referencedPaths.has(key)) {
      kept++
      continue
    }

    const isDirectIpa = parts.length === 3 && firstChild.endsWith('.ipa')
    if (isDirectIpa) {
      const referencedIpaNames = referencedIpaNamesByOwner.get(userId) || new Set<string>()
      if (!referencedIpaNames.has(firstChild)) {
        addDeletePrefix(deletePrefixes, key)
      } else {
        kept++
      }
      continue
    }

    if (firstChild === 'icons') {
      addDeletePrefix(deletePrefixes, key)
      continue
    }

    const validAppDirs = validAppDirsByOwner.get(userId) || new Set<string>()
    const validSignedVersionDirs = validSignedVersionDirsBySigner.get(userId) || new Set<string>()
    if (!validAppDirs.has(firstChild) && !validSignedVersionDirs.has(firstChild)) {
      addDeletePrefix(deletePrefixes, `uploads/${userId}/${firstChild}`)
      continue
    }

    addDeletePrefix(deletePrefixes, key)
  }

  const sortedPrefixes = Array.from(deletePrefixes).sort()
  return {
    deletePrefixes: sortedPrefixes,
    kept,
    totalCleaned: sortedPrefixes.length
  }
}
