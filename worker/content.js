import { listPublishedAlbums, listPublishedSongs, getVersion } from './db'
import { json } from './json'

// Worker responses are not cached by Cloudflare unless the Worker puts them
// there itself, so this does it explicitly. That is not an optimisation to get
// to later: uncached, every visitor costs one D1 read per song in the
// catalogue, and the free tier's 5M rows/day is only about 33k page views once
// there are 150 songs. Cached, it is a handful of reads a minute.
// max-age does the quota work; the stale window only matters when a
// revalidation cannot happen. Ten minutes, not a day: if the post-write purge
// fails to reach the colo serving Frank, that window is how long his own change
// stays invisible to him — which is indistinguishable, from where he sits, from
// the write having failed. Ten minutes still spares D1 an outage's traffic.
const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=600'

// A fixed key, so the cache is not fragmented by query strings someone appends.
function cacheKey(request) {
  const url = new URL(request.url)
  return new Request(`${url.origin}/api/content`, { method: 'GET' })
}

export async function getContent(request, env, ctx) {
  const cache = caches.default
  const key = cacheKey(request)

  const hit = await cache.match(key)
  if (hit) return hit

  const [songs, albums, version] = await Promise.all([
    listPublishedSongs(env),
    listPublishedAlbums(env),
    getVersion(env),
  ])

  // The base travels with the data rather than being compiled into the bundle,
  // so the client has no build-time knowledge of where audio lives and local
  // development can point somewhere else without a rebuild.
  const response = json(
    { version, mediaBase: env.MEDIA_BASE ?? '', albums, songs },
    { headers: { 'cache-control': CACHE_CONTROL, 'x-content-source': 'd1' } },
  )

  ctx.waitUntil(cache.put(key, response.clone()))
  return response
}

// Called after every admin write, so publishing is visible at the edge at once
// and only the browser's 60s max-age stands between Frank and seeing his change.
export function purgeContent(request, ctx) {
  ctx.waitUntil(caches.default.delete(cacheKey(request)))
}
