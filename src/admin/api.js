// Thin wrapper over /api/admin/*. Every call either returns parsed JSON or
// throws an Error carrying the server's own message, so callers never have to
// look at status codes.
//
// There are no credentials here: Cloudflare Access authenticates at the edge
// and the browser carries its cookie automatically.
//
// An expired session does NOT arrive here as a 401. Access answers an
// unauthenticated /api/admin/* request with a 302 to the login page on
// <team>.cloudflareaccess.com, and a fetch that follows a redirect to another
// origin is blocked by CORS — so it rejects with a bare TypeError reading
// "Failed to fetch", which tells the user nothing. Only a navigation can
// complete that handshake, which is why the remedy is always to navigate
// rather than to retry the request.
//
// Every failure here carries a `code`, because the remedy differs and getting
// it wrong is unfixable rather than merely unhelpful:
//
//   expired   — sign in again; a navigation will reach Access's login page.
//   forbidden — signing in again changes nothing. Access already said yes; it
//               is this site that says no. Only signing out as someone else,
//               or an ADMIN_EMAILS edit, gets past it.
//

const BASE = '/api/admin'

const EXPIRED = 'Your session has expired.'

function authError(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

async function request(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    // Network-level failure. Being genuinely offline looks identical from here,
    // but the Access redirect is much the likelier cause on a page that only
    // loads from behind Access at all.
    throw authError(EXPIRED, 'expired')
  }

  // Same-origin request that came back from somewhere else: Access bounced it
  // to a login page and CORS happened to permit the read. Same meaning.
  if (response.redirected || response.status === 401) {
    throw authError(EXPIRED, 'expired')
  }

  const data = await response.json().catch(() => ({}))

  // The Worker's own refusal, naming the address Access authenticated. Its
  // message is better than anything that could be written here, so it is
  // passed through whole.
  if (response.status === 403) {
    throw authError(data.error ?? 'This account may not edit the site.', 'forbidden')
  }

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
  deleted: () => request('/deleted'),
  restore: (id) => request(`/songs/${encodeURIComponent(id)}/restore`, { method: 'POST' }),
  purge: (id) => request(`/songs/${encodeURIComponent(id)}/purge`, { method: 'DELETE' }),
  storage: () => request('/storage'),
  sweepStorage: () => request('/storage', { method: 'POST' }),
}
