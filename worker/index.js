import { verifyAccess } from './access'
import { getContent } from './content'
import { listAllSongs } from './db'
import { fail, json } from './json'

// This Worker answers /api/* and nothing else. Every page, script, stylesheet
// and audio file is a static asset, which Cloudflare serves without invoking
// the Worker at all — free, and not counted against the request quota. The
// `run_worker_first: ["/api/*"]` setting in wrangler.jsonc is what draws that
// line: without it the SPA's not_found_handling would answer /api/content with
// index.html and this code would never run.

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)

    // Belt and braces. If routing is ever misconfigured, say so plainly rather
    // than returning something that looks like a page.
    if (!pathname.startsWith('/api/')) {
      return fail(404, 'Not found')
    }

    if (pathname === '/api/content') {
      if (request.method !== 'GET') return fail(405, 'Method not allowed')
      return getContent(request, env, ctx)
    }

    if (pathname.startsWith('/api/admin/')) {
      const identity = await verifyAccess(request, env)
      if (!identity) return fail(401, 'Not authenticated')
      return handleAdmin(pathname, request, env, identity)
    }

    return fail(404, 'Not found')
  },
}

async function handleAdmin(pathname, request, env, identity) {
  if (pathname === '/api/admin/session' && request.method === 'GET') {
    return json({
      email: identity.email,
      // The admin client branches on this rather than sniffing the environment,
      // so the difference between local and deployed is one explicit flag.
      // Presigned uploads need a real S3 endpoint, which local R2 does not have.
      capabilities: { presign: Boolean(env.R2_ACCESS_KEY_ID && env.R2_ACCOUNT_ID) },
      bypass: identity.bypass,
    })
  }

  if (pathname === '/api/admin/songs' && request.method === 'GET') {
    return json({ songs: await listAllSongs(env) })
  }

  return fail(404, 'Not found')
}
