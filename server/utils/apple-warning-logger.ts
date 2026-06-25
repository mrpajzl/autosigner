type WarningKey = string

type WarningState = {
  firstSeenAt: number
  lastSeenAt: number
  occurrences: number
  lastMessage: string
}

const AGREEMENT_ERROR_PATTERN = /agreement missing or expired|required agreement is missing or has expired|in-effect agreement that has not been signed or has expired|REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED/i
const WARNING_INTERVAL_MS = 15 * 60 * 1000
const warningState = new Map<WarningKey, WarningState>()

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return 'Unknown Apple Developer API error'
}

function anonymizeId(id?: string | null): string | null {
  if (!id) return null
  if (id.length <= 6) return `…${id}`
  return `…${id.slice(-6)}`
}

export function isAppleAgreementError(error: unknown): boolean {
  return AGREEMENT_ERROR_PATTERN.test(errorMessage(error))
}

function safeLabel(label?: string | null): string | null {
  const normalized = label?.replace(/\s+/g, ' ').trim()
  return normalized || null
}

export function logAppleDeveloperWarning(options: {
  scope: string
  error: unknown
  moderatorId?: string | null
  accountLabel?: string | null
}): void {
  const message = errorMessage(options.error)

  if (!isAppleAgreementError(options.error)) {
    console.error(`[AppleDeveloperAPI] ${options.scope} failed:`, options.error)
    return
  }

  const moderatorRef = anonymizeId(options.moderatorId)
  const accountLabel = safeLabel(options.accountLabel)
  const key = [options.scope, moderatorRef || 'unknown-moderator', accountLabel || 'unknown-account'].join('|')
  const now = Date.now()
  const existing = warningState.get(key)

  if (!existing) {
    warningState.set(key, {
      firstSeenAt: now,
      lastSeenAt: now,
      occurrences: 1,
      lastMessage: message
    })
    console.warn('[AppleDeveloperAPI] Apple Developer agreement missing or expired', {
      scope: options.scope,
      moderatorRef,
      accountLabel,
      occurrences: 1,
      message
    })
    return
  }

  existing.lastSeenAt = now
  existing.occurrences += 1
  existing.lastMessage = message

  if (now - existing.firstSeenAt < WARNING_INTERVAL_MS) {
    return
  }

  console.warn('[AppleDeveloperAPI] Apple Developer agreement missing or expired', {
    scope: options.scope,
    moderatorRef,
    accountLabel,
    occurrences: existing.occurrences,
    windowSeconds: Math.round((now - existing.firstSeenAt) / 1000),
    message: existing.lastMessage
  })

  warningState.set(key, {
    firstSeenAt: now,
    lastSeenAt: now,
    occurrences: 0,
    lastMessage: message
  })
}
