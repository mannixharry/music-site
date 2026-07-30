// Turning numbers into the strings people read. Shared by the site and the
// admin, which is why it sits above both: there were three copies of the first
// of these and two of the second, and they had already drifted.

// m:ss. `blank` is what an unknown length looks like — the player wants a
// same-width placeholder holding the layout open, a table would rather show a
// dash — so the caller says which.
export function formatTime(seconds, { blank = '--:--' } = {}) {
  if (!Number.isFinite(seconds)) return blank

  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

// Rounded hard, because these are shown to say "is this file about the size I
// expected" and never to account for anything.
export function formatBytes(bytes) {
  if (!bytes) return '—'

  const mb = bytes / 1024 / 1024
  return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1)} MB`
}
