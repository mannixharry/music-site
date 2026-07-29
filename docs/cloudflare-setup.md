# Cloudflare setup

One-off provisioning for the admin at `frankkirwan.com/admin`. Everything here
is account work that cannot be done from the repo. Nothing in the site breaks
while it is outstanding — the Worker fails closed, and the public pages keep
rendering the committed snapshot.

Work through it in order; step 5 depends on the ids from steps 2–4.

---

## 0. Sign wrangler in

```
npx wrangler login
```

Opens a browser. In WSL, if it cannot launch one, copy the printed URL into
Windows manually. Check it took:

```
npx wrangler whoami
```

You also need two ids to hand, both on the Cloudflare dashboard:

- **Account ID** — Workers & Pages → Overview, right-hand sidebar
- **Zone ID** for frankkirwan.com — the domain's Overview page, right-hand sidebar

---

## 1. Create the database

```
npx wrangler d1 create artist-site
```

It prints a `database_id`. Put it in `wrangler.jsonc`, replacing the
`00000000-…` placeholder. Then create the tables and load the current
catalogue:

```
npm run db:migrate
npm run db:seed
```

**Check:** `npx wrangler d1 execute artist-site --remote --command "SELECT COUNT(*) FROM songs"`
should say 9.

---

## 2. Create the buckets

```
npx wrangler r2 bucket create frank-kirwan-media
npx wrangler r2 bucket create frank-kirwan-masters
```

Two, not one with prefixes: an R2 custom domain exposes an entire bucket and
has no per-prefix access control, so masters kept alongside the public files
would be downloadable by anyone who guessed a song's name.

Attach the media domain (public reads) — `<zone-id>` from step 0:

```
npx wrangler r2 bucket domain add frank-kirwan-media \
  --domain media.frankkirwan.com --zone-id <zone-id>
```

Now CORS. **Both** buckets need it, not just masters: the browser PUTs the
original to `frank-kirwan-masters` and the converted MP3 to
`frank-kirwan-media`, and both are cross-origin from frankkirwan.com.

```
npx wrangler r2 bucket cors set frank-kirwan-media   --file infra/r2-cors.json
npx wrangler r2 bucket cors set frank-kirwan-masters --file infra/r2-cors.json
```

`infra/r2-cors.json` is in wrangler's schema — `{"rules": [{"allowed": {…}}]}`
with camelCase keys. The R2 **dashboard** takes a different shape for the same
thing (a bare array, PascalCase `AllowedOrigins`), so do not copy a policy from
one into the other. It also permits `localhost:5173` and `localhost:8787`,
which is what lets `wrangler dev --remote` exercise the presigned upload path;
a presigned URL is still required, so this widens who the browser will let
talk to R2, not who can write to it.

**Check:** put a file in the public bucket and fetch it over the domain.

```
echo hello > /tmp/probe.txt
npx wrangler r2 object put frank-kirwan-media/probe.txt --file /tmp/probe.txt --remote
curl -I https://media.frankkirwan.com/probe.txt        # expect 200
npx wrangler r2 object delete frank-kirwan-media/probe.txt --remote
```

A new R2 custom domain reports `ssl_status: pending` for a minute or two while
its certificate is issued, and requests during that window can come back 401 —
which looks alarming and means nothing. Re-check with
`wrangler r2 bucket domain list frank-kirwan-media` and try again rather than
reconfiguring anything.

**Also confirm the masters bucket is not reachable at all**, since this is the
whole reason there are two:

```
npx wrangler r2 bucket domain list  frank-kirwan-masters   # expect none
npx wrangler r2 bucket dev-url get  frank-kirwan-masters   # expect disabled
npx wrangler r2 bucket dev-url get  frank-kirwan-media     # expect disabled too
```

The media bucket is public through its custom domain only. The `r2.dev` URL
stays off: it is rate-limited and explicitly not for production.

---

## 3. Create the R2 API token

This is what signs upload URLs. It is separate from the bucket bindings —
bindings let the Worker read and write, but presigning needs S3 credentials.

Dashboard → R2 → **API** → *Manage API tokens* → **Create API token**

- Permission: **Object Read & Write**
- Scope it to the two buckets rather than the whole account
- TTL: whatever you are comfortable with

It shows an **Access Key ID** and a **Secret Access Key** once. Copy both now.

---

## 4. Create the Access applications

Zero Trust dashboard: <https://one.dash.cloudflare.com>

First, your **team name**: Settings → Custom Pages (or General) shows a team
domain like `yourteam.cloudflareaccess.com`. `ACCESS_TEAM` is the `yourteam`
part only.

If this is the account's first visit, Zero Trust asks you to choose a **team
name** and pick a plan. Choose **Free** — it covers 50 users and this needs
two. It may still ask for a card to complete signup; nothing here is billable.

Then check One-time PIN is available under Settings → Authentication. It is on
by default, and it is what means Frank needs no account anywhere — just an
inbox.

Create **two** self-hosted applications — Access → Applications → *Add an
application* → **Self-hosted**:

| | Application 1 | Application 2 |
|---|---|---|
| Name | Frank Kirwan admin | Frank Kirwan admin API |
| Domain | `frankkirwan.com` | `frankkirwan.com` |
| Path | `admin` | `api/admin` |

> **Fill in the path.** An application on `frankkirwan.com` with the path left
> blank puts the entire public site behind a login — every visitor met by a
> PIN prompt. The path box is what confines each application to the admin. It
> is the one mistake in this document with a blast radius beyond the admin
> itself, and the check is simply to open the site in a private window
> afterwards and confirm it still loads.

`admin` also covers everything beneath it, and `api/admin` likewise. Neither
matches `/api/content`, which must stay public — that is the endpoint the site
itself reads.

Two rather than one because an unauthenticated request should be redirected to
a login page when it is a person opening `/admin`, and simply refused when it
is the page's own `fetch`.

Give each the same policy:

- Action: **Allow**
- Include → **Emails** → `mannixharry@gmail.com`

Adding Frank later means adding his address to both policies — a dashboard
edit, no deploy.

Each application's Overview shows an **Application Audience (AUD) Tag**. Copy
both. The Worker checks against a comma-separated list, so a token from either
application is accepted and one minted for anything else is not.

---

## 5. Fill in the config

In `wrangler.jsonc` → `vars`:

```jsonc
"ACCESS_TEAM": "yourteam",
"ACCESS_AUD": "<aud-of-app-1>,<aud-of-app-2>"
```

Secrets are never written in that file:

```
npx wrangler secret put R2_ACCESS_KEY_ID       # from step 3
npx wrangler secret put R2_SECRET_ACCESS_KEY   # from step 3
npx wrangler secret put R2_ACCOUNT_ID          # from step 0
```

Until `ACCESS_TEAM` and `ACCESS_AUD` are both set, every `/api/admin/*` route
refuses everything. That is deliberate — never work around it by loosening
`worker/access.js`.

---

## 6. Deploy and check

```
npm run deploy
```

Then, in order:

1. `curl https://frankkirwan.com/api/content` → JSON, 9 songs.
2. `curl -I https://frankkirwan.com/api/admin/songs` → a redirect or 403 from
   Access, **not** a 200 and not your own 401. A 401 means Access is not in
   front of the path — recheck the application's domain and path.
3. Open `https://frankkirwan.com/admin` in a private window → Access asks for
   an email → PIN arrives → the song list appears. There should be **no**
   "Local development" banner.
4. Send a forged token — this proves the signature check, not just Access:
   ```
   curl -s -o /dev/null -w '%{http_code}\n' \
     -H 'Cf-Access-Jwt-Assertion: not.a.real.token' \
     https://frankkirwan.com/api/admin/songs
   ```
   Expect 401 or an Access refusal; never 200.
5. `curl -I https://artist-site.<your-subdomain>.workers.dev` → should not
   resolve. `workers_dev` is false because Access does not cover that hostname.

---

## 7. First real upload

The presigned path has never run — it needs an S3 endpoint, which the local
emulator does not have, so this is its first execution. Expect to spend a
little time here.

Upload a short MP3 first (under 12MB), which skips conversion and exercises
only the signing and CORS. Then try a WAV to test the encoder.

If you get **`SignatureDoesNotMatch`**: the cause is almost always a
`Content-Type` that differs between what the Worker signed and what the browser
sent. Compare `worker/presign.js` against the `content-type` header in the
failing PUT in devtools. If the request fails at the *browser* with an opaque
CORS error instead, step 2's CORS did not apply to that bucket.

---

## Afterwards

- Migrate the seven files still in `public/audio/` into R2 and repoint their
  `web_key`s, then delete them from the repo.
- Add `pull-snapshot.mjs` as a `prebuild` step so `snapshot.json` refreshes
  from D1 on every deploy.
- Ask Frank for **FLAC** masters rather than WAV. At 150 songs that is roughly
  4.5GB against R2's 10GB free tier, where WAV would be about 8.5GB.
- Before going public: remove the `noindex` meta from `index.html`, and replace
  the remaining placeholder copy (song descriptions, `#` Spotify links, the
  Pigs and Copperfield resumes, `frank@example.com`).
