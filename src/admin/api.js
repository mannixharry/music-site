// Thin wrapper over /api/admin/*. Every call either returns parsed JSON or
// throws an Error carrying the server's own message, so callers never have to
// look at status codes.
//
// There are no credentials here: Cloudflare Access authenticates at the edge
// and the browser carries its cookie automatically. A 401 means the session
// expired, and the fix is to reload so Access can challenge again.

const BASE = '/api/admin'

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    throw new Error('Your session has expired — reload the page to sign in again.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`)
  return data
}

export const api = {
  session: () => request('/session'),
  list: () => request('/songs'),
  create: (input) => request('/songs', { method: 'POST', body: input }),
  update: (id, patch) => request(`/songs/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  remove: (id) => request(`/songs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  move: (id, after) =>
    request(`/songs/${encodeURIComponent(id)}/position`, { method: 'POST', body: { after } }),
}
