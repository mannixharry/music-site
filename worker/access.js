import { createRemoteJWKSet, jwtVerify } from 'jose'

// Cloudflare Access authenticates /admin at the edge, so an anonymous request
// never reaches this Worker. This file is the second lock: it proves the
// request really did come through Access, because "Access is in front of it" is
// only true for the hostnames Access is actually configured on.
//
// Returns the caller's identity, or null. Never throws — callers treat null as
// "no", and there is no third answer.

// Module scope: the isolate reuses the fetched key set across requests instead
// of hitting the certs endpoint on every call.
let keySet = null
let keySetTeam = null

function getKeySet(team) {
  if (!keySet || keySetTeam !== team) {
    keySet = createRemoteJWKSet(
      new URL(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`),
    )
    keySetTeam = team
  }
  return keySet
}

function readCookie(request, name) {
  const header = request.headers.get('cookie')
  if (!header) return null

  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

export async function verifyAccess(request, env) {
  const url = new URL(request.url)

  // There is no Access in front of localhost, so local development would
  // otherwise be locked out of its own admin page. Two independent conditions
  // have to hold: an explicit flag that lives only in .dev.vars (which wrangler
  // reads in `dev` and never uploads), and a loopback hostname.
  //
  // Deliberately NOT "allow when ACCESS_AUD is unset" — that shape fails open
  // the day someone mistypes a variable name in production.
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (env.DEV_BYPASS_AUTH === 'true' && loopback) {
    return { email: 'dev@localhost', bypass: true }
  }

  if (!env.ACCESS_TEAM || !env.ACCESS_AUD) return null

  // One Access application covers both the admin page and this API, so in
  // practice this is a single tag. It is still parsed as a comma-separated
  // list: splitting them across two applications is the tempting design, and
  // if it is ever revisited, both tags have to be named here or signing in
  // appears to work and every request is then rejected.
  const audience = env.ACCESS_AUD.split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  if (audience.length === 0) return null

  // Access sends the header; the cookie is the fallback for a browser hitting
  // the API directly, as the admin page's own fetches do.
  const token =
    request.headers.get('Cf-Access-Jwt-Assertion') ?? readCookie(request, 'CF_Authorization')
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getKeySet(env.ACCESS_TEAM), {
      issuer: `https://${env.ACCESS_TEAM}.cloudflareaccess.com`,
      // The audience check is the one that is easy to leave out and expensive
      // to leave out: without it, a token minted for ANY other application in
      // the same Zero Trust organisation verifies perfectly well here. A list
      // still means "one of these", not "anything".
      audience,
    })

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null
    if (!email) return null

    // The Access policy already restricts who can get a token. This repeats it
    // in code so that a mis-edited policy is not the only thing standing here.
    const allowed = (env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)

    if (allowed.length > 0 && !allowed.includes(email)) return null

    return { email, bypass: false }
  } catch {
    // Expired, wrong audience, bad signature, malformed — all the same answer.
    return null
  }
}
