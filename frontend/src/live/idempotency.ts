import { useRef } from 'react'

// Preserve a key for the same uncertain attempt, not for a different edited payload.
export function useAttemptKey() {
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null)
  return (body: unknown) => {
    const fingerprint = JSON.stringify(body)
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() }
    return attempt.current.key
  }
}
