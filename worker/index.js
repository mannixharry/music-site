import { verifyAccess } from './access'
import { getContent, purgeContent } from './content'
import {
  createSong,
  deleteSong,
  getSong,
  listAllSongs,
  moveSong,
  purgeSong,
  restoreSong,
  updateSong,
} from './db'
import { fail, json } from './json'
import {
  deleteOrphans,
  deleteReplacedObjects,
  deleteSongObjects,
  readObjectKeys,
  readStorage,
} from './objects'
import { presignPut } from './presign'
import {
  slugify,
  validateSong,
  validateUpload,
  ruleForKey,
  AUDIO_TYPES,
  IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_IMAGE_BYTES,
} from './validate'

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

    // Local-only convenience: serves the emulated R2 bucket so uploads can be
    // auditioned without a media domain. In production MEDIA_BASE points at
    // media.frankkirwan.com, which Cloudflare serves directly — cached, free,
    // and without waking this Worker.
    if (pathname.startsWith('/api/media/')) {
      if (request.method !== 'GET') return fail(405, 'Method not allowed')
      return serveMedia(pathname.slice('/api/media/'.length), env)
    }

    if (pathname.startsWith('/api/admin/')) {
      const identity = await verifyAccess(request, env)
      if (!identity) return fail(401, 'Not authenticated')

      try {
        return await handleAdmin(pathname, request, env, ctx, identity)
      } catch (error) {
        console.error('admin error', error)
        return fail(500, error?.message ?? 'Something went wrong')
      }
    }

    return fail(404, 'Not found')
  },
}

async function serveMedia(key, env) {
  const object = await env.MEDIA.get(key)
  if (!object) return fail(404, 'Not found')

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  // Keys carry a content hash, so a given URL never changes what it points at.
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('accept-ranges', 'bytes')

  return new Response(object.body, { headers })
}

// Matches "/api/admin/songs/:id" and its three verbs — /position, /restore and
// /purge. An unrecognised one falls through to a 404 rather than being treated
// as part of the id, so a typo cannot quietly address a different song.
function songRoute(pathname) {
  const match = pathname.match(/^\/api\/admin\/songs\/([^/]+)(?:\/(position|restore|purge))?$/)
  if (!match) return null
  return { id: decodeURIComponent(match[1]), action: match[2] ?? null }
}

async function handleAdmin(pathname, request, env, ctx, identity) {
  const method = request.method
  const presign = Boolean(env.R2_ACCESS_KEY_ID && env.R2_ACCOUNT_ID)

  if (pathname === '/api/admin/session' && method === 'GET') {
    return json({
      email: identity.email,
      // The admin client branches on this rather than sniffing the
      // environment, so the difference between local and deployed is one
      // explicit flag. Presigned uploads need a real S3 endpoint, which the
      // local emulated R2 does not have.
      capabilities: {
        presign,
        maxUploadBytes: MAX_UPLOAD_BYTES,
        audioTypes: AUDIO_TYPES,
        maxImageBytes: MAX_IMAGE_BYTES,
        imageTypes: IMAGE_TYPES,
      },
      bypass: identity.bypass,
    })
  }

  // Hands a master back to the browser. This is the only way the full song is
  // reachable from anywhere — MASTERS has no custom domain and no r2.dev URL —
  // and it is what makes a preview reversible rather than a one-way door.
  //
  // Safe only because of where it sits: everything under /api/admin/ has already
  // been through verifyAccess by the time it gets here. The prefix check is the
  // second lock, and it is not decoration — without it this route would serve
  // any object in either bucket to anyone who reached it.
  //
  // no-store, because a master must not sit in a shared cache anywhere.
  if (pathname.startsWith('/api/admin/master/')) {
    if (method !== 'GET') return fail(405, 'Method not allowed')

    const key = decodeURIComponent(pathname.slice('/api/admin/master/'.length))
    if (ruleForKey(key)?.bucket !== 'MASTERS') return fail(400, 'not a master')

    const object = await env.MASTERS.get(key)
    if (!object) return fail(404, 'Not found')

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('cache-control', 'private, no-store')
    return new Response(object.body, { headers })
  }

  if (pathname === '/api/admin/songs') {
    if (method === 'GET') {
      return json({ songs: await listAllSongs(env), mediaBase: env.MEDIA_BASE ?? '' })
    }

    if (method === 'POST') {
      const input = await request.json()
      const problem = validateSong(input)
      if (problem) return fail(400, problem)

      const id = slugify(input.id || input.title)
      if (!id) return fail(400, 'could not make a slug from that title')
      if (await getSong(env, id)) return fail(409, `"${id}" already exists`)

      const song = await createSong(env, { ...input, id })
      purgeContent(request, ctx)
      return json({ song }, { status: 201 })
    }

    return fail(405, 'Method not allowed')
  }

  const route = songRoute(pathname)
  if (route) {
    if (route.action === 'position') {
      if (method !== 'POST') return fail(405, 'Method not allowed')
      const { after = null } = await request.json()
      await moveSong(env, route.id, after)
      purgeContent(request, ctx)
      return json({ songs: await listAllSongs(env) })
    }

    // Out of the bin, as a draft. Nothing a visitor can see changes, so there
    // is no cache to purge — but the version moves, because the admin's own
    // copy of the catalogue has.
    if (route.action === 'restore') {
      if (method !== 'POST') return fail(405, 'Method not allowed')
      const song = await restoreSong(env, route.id)
      if (!song) return fail(404, 'No such song in the bin')
      return json({ song, songs: await listAllSongs(env) })
    }

    // The end of the line: the row goes, and so does every object the song
    // ever put in either bucket — not only the four it still names, but the
    // previews and converted copies left over from earlier uploads.
    //
    // Keys are read first and the objects removed after the row: a failure
    // between them leaves files nothing points at, which the storage sweep can
    // find, rather than a row pointing at nothing.
    if (route.action === 'purge') {
      if (method !== 'DELETE') return fail(405, 'Method not allowed')

      const keys = await readObjectKeys(env, route.id)
      if (!(await purgeSong(env, route.id))) return fail(404, 'No such song in the bin')

      ctx.waitUntil(deleteSongObjects(env, route.id, keys))
      return json({ purged: route.id })
    }

    if (method === 'PATCH') {
      const patch = await request.json()
      const problem = validateSong(patch, { partial: true })
      if (problem) return fail(400, problem)

      // Read before the update, delete after it: an object is only unreferenced
      // once the row has actually stopped naming it, and doing it in that order
      // means a failed update cannot take the file with it.
      const before = await readObjectKeys(env, route.id)

      const song = await updateSong(env, route.id, patch)
      if (!song) return fail(404, 'No such song')

      // After the response, not before it. Tidying is not what the caller is
      // waiting for, and an upload should not appear slower for doing it.
      ctx.waitUntil(deleteReplacedObjects(env, before, patch))
      purgeContent(request, ctx)
      return json({ song })
    }

    if (method === 'DELETE') {
      if (!(await getSong(env, route.id))) return fail(404, 'No such song')
      await deleteSong(env, route.id)
      purgeContent(request, ctx)
      return json({ deleted: route.id })
    }

    return fail(405, 'Method not allowed')
  }

  // What the site is using, what it is using for nothing, and what is in the
  // bin — one answer, because the admin shows all three together and every one
  // of them moves when any of the others does.
  //
  // POST removes only the unreferenced files. Separated from GET so the count
  // can always be looked at before anything is destroyed.
  //
  // Every write already deletes the object it replaced, so in normal use the
  // orphan list is empty; it covers what accumulated before that existed and the
  // gap no bookkeeping closes, where an upload reaches R2 and then fails to
  // record itself.
  if (pathname === '/api/admin/storage') {
    if (method === 'GET') return json(await readStorage(env))

    if (method === 'POST') {
      const { orphans } = await readStorage(env)
      return json({ deleted: await deleteOrphans(env, orphans), orphans })
    }

    return fail(405, 'Method not allowed')
  }

  // Signs a URL the browser can PUT to directly, so the audio never passes
  // through here. Authenticated like every other admin route — an open presign
  // endpoint is an open write handle on the bucket.
  if (pathname === '/api/admin/uploads' && method === 'POST') {
    if (!presign) return fail(400, 'Presigned uploads are not configured here')

    const { key, contentType, size } = await request.json()
    if (!key || key.includes('..') || key.startsWith('/')) return fail(400, 'bad key')

    // The browser checked this too. That check is a courtesy; this one decides.
    const problem = validateUpload({ key, contentType, size })
    if (problem) return fail(400, problem)

    // The key's prefix chooses the bucket, not the request — so a signature for
    // a public object can never be handed out for the private one, or the reverse.
    const rule = ruleForKey(key)
    const bucketName = rule.bucket === 'MASTERS' ? env.MASTERS_BUCKET : env.MEDIA_BUCKET
    const uploadUrl = await presignPut({ env, bucketName, key, contentType })
    return json({ uploadUrl, key })
  }

  // Streams a file straight into R2 through the Worker. This exists for local
  // development, where there is no S3 endpoint to presign against. In
  // production the browser PUTs to a presigned URL instead, so the audio never
  // passes through here — which matters, because the free plan allows 10ms of
  // CPU per request and request bodies stop at 100MB.
  if (pathname === '/api/admin/blob' && method === 'PUT') {
    if (presign) return fail(400, 'Use a presigned upload in this environment')

    const url = new URL(request.url)
    const key = url.searchParams.get('key') ?? ''
    const contentType = request.headers.get('content-type') ?? ''
    const size = Number(request.headers.get('content-length') ?? 0)

    if (!key || key.includes('..') || key.startsWith('/')) return fail(400, 'bad key')

    const problem = validateUpload({ key, contentType, size })
    if (problem) return fail(400, problem)

    // Same rule as the presigned path: the prefix decides the bucket.
    const { bucket } = ruleForKey(key)
    await env[bucket].put(key, request.body, { httpMetadata: { contentType } })
    return json({ key, bucket: bucket.toLowerCase(), size })
  }

  return fail(404, 'Not found')
}
