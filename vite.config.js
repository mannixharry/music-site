import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Stamps every build with an id, in two places that have to agree:
//
//   virtual:build-id   imported by the bundle, so the running page knows which
//                      build it *is*
//   /build.json        emitted beside it, so the running page can ask which
//                      build is *deployed*
//
// That pair is what lets a browser holding a stale copy of index.html notice
// and fix itself — see src/components/FreshBuild.jsx. It only works because the
// two travel separately: index.html and the hashed assets it names can all be
// cached, while build.json is fetched with `no-store` and cannot.
//
// A virtual module rather than `define`. A define is a global that the editor,
// the linter and `vite dev` each have to be told about separately — and was not
// substituted under `vite dev` at all, which left the check throwing a
// ReferenceError into its own catch and doing nothing, in the one environment
// where you would try to see whether it worked. An import is just an import.
//
// The id is a timestamp rather than the git SHA. The SHA does not move when a
// deploy carries uncommitted work, which is the case most likely to leave
// someone looking at the wrong thing; a timestamp always moves. The cost of it
// moving when nothing else did is one reload at the start of a visit, which is
// not something anyone can see.
//
// Emitted with emitFile rather than written into public/, so a build leaves no
// untracked file behind.
const VIRTUAL = 'virtual:build-id'
const RESOLVED = `\0${VIRTUAL}`

function buildStamp() {
  const id = Date.now().toString(36)
  const body = `${JSON.stringify({ build: id }, null, 2)}\n`

  return {
    name: 'build-stamp',

    resolveId: (source) => (source === VIRTUAL ? RESOLVED : null),
    load: (resolved) =>
      resolved === RESOLVED ? `export const BUILD_ID = ${JSON.stringify(id)}\n` : null,

    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build.json', source: body })
    },

    // Serves the same file under `vite dev`, where nothing is emitted. Without
    // it the dev server answers /build.json with index.html — the SPA fallback
    // doing its job — and the check silently reads a page as if it were JSON.
    configureServer(server) {
      server.middlewares.use('/build.json', (_req, res) => {
        res.setHeader('content-type', 'application/json')
        res.setHeader('cache-control', 'no-store')
        res.end(body)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), buildStamp()],

  server: {
    // `npm run dev` serves the pages; `npm run dev:worker` serves the API on
    // 8787. Proxying keeps them on one origin, so the app's fetch('/api/...')
    // is the same line locally as in production. With no Worker running the
    // proxy just fails, and ContentProvider falls back to the committed
    // snapshot — which is exactly what it does in production if the API is down.
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
