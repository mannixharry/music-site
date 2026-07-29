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
which looks alarming and means nothing.

It can also fail properly. Watch `ownership_status`: `active` is healthy,
**`unknown` is not**, and the symptom is the subdomain serving a file once and
then going NXDOMAIN — the record is created, then rolled back. Remove the
domain and add it again:

```
npx wrangler r2 bucket domain remove frank-kirwan-media --domain media.frankkirwan.com
npx wrangler r2 bucket domain add    frank-kirwan-media --domain media.frankkirwan.com --zone-id <zone-id>
```

Diagnose it at the authoritative resolver rather than through your own
machine, because a failed attempt leaves a negative cache entry that outlives
the fix and makes a working domain look broken:

```
curl -s -H 'accept: application/dns-json' \
  'https://1.1.1.1/dns-query?name=media.frankkirwan.com&type=A'
```

`"Status": 0` with an answer means DNS is fine and anything still failing
locally is your resolver. `"Status": 3` is NXDOMAIN — the record really is
absent. To test the origin while your own DNS is poisoned, pin the address:

```
curl -I --resolve media.frankkirwan.com:443:<ip-from-above> \
  https://media.frankkirwan.com/probe.txt
```

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

Next, add One-time PIN as a login method. It is what means Frank needs no
account anywhere — just an inbox he can read.

> **A new organisation does not have it.** Since June 2026 Cloudflare gives new
> Zero Trust organisations its own **Cloudflare identity provider** as the
> default; before that they started with One-time PIN. The Cloudflare IdP
> authenticates *only members of the Cloudflare account*, so signing in as
> anyone else fails with *"Cloudflare sign-in is restricted to members of the
> account"*. That bites here twice over: the account is
> `harrymannix@icloud.com` while the Access policies name
> `mannixharry@gmail.com`, and Frank will never be a member of the account at
> all.

**Zero Trust → Integrations → Identity providers → Add new identity provider →
One-time PIN.** Not *Access controls → Access settings*, which is global
policy settings and does not list login methods.

Then point each application at it: **Access controls → Applications → edit →
Authentication**, and select **One-time PIN** (or turn on *Accept all available
identity providers*).

Keep the policy's Include rule as a specific **email list**. One-time PIN with
an unrestricted Include means anyone with any email address can request a code
and get in.

Whichever address you actually sign in with must also appear in `ADMIN_EMAILS`
in `wrangler.jsonc`. `worker/access.js` checks it after Access has already let
the request through, so a mismatch produces a login that appears to succeed
followed by a refusal — with nothing on screen to say which of the two lists
was the problem.

Create **one** self-hosted application — Access → Applications → *Add an
application* → **Self-hosted** — covering **two** paths on the same hostname.
Add the first as the application's domain, then *Add domain* for the second:

| | |
|---|---|
| Name | Frank Kirwan admin |
| Domain | `frankkirwan.com`, path `admin` |
| Domain | `frankkirwan.com`, path `api/admin` |

> **Fill in the path, on both.** An application on `frankkirwan.com` with the
> path left blank puts the entire public site behind a login — every visitor
> met by a PIN prompt. The path box is what confines the application to the
> admin. It is the one mistake in this document with a blast radius beyond the
> admin itself, and the check is simply to open the site in a private window
> afterwards and confirm it still loads.

`admin` also covers everything beneath it, and `api/admin` likewise. Neither
matches `/api/content`, which must stay public — that is the endpoint the site
itself reads.

> **One application, not two.** Splitting the page and the API into separate
> applications is the obvious design and it is broken. Each application keeps
> its own session, and an Access session can only be established by a
> **navigation**: an unauthenticated request is answered with a 302 to the
> login page on `<team>.cloudflareaccess.com`, and a `fetch` that follows a
> redirect to another origin is blocked by CORS before it can complete the
> handshake. Nothing ever navigates to `/api/admin` — only the admin page's own
> `fetch` goes there — so that application's session is never renewed. The
> admin then fails with a bare `TypeError: Failed to fetch`, which names
> neither Access nor the session, and the only cure is to visit an
> `/api/admin/*` URL in the address bar by hand.
>
> Renaming the Zero Trust team invalidates existing sessions, which is a good
> way to walk into this: the page's session silently repairs itself on the next
> load, and the API's cannot.

Give it this policy:

- Action: **Allow**
- Include → **Emails** → `mannixharry@gmail.com`

Adding Frank later means adding his address to this policy and to
`ADMIN_EMAILS` — the first is a dashboard edit, the second needs a deploy.

The application's Overview shows an **Application Audience (AUD) Tag**. Copy
it. The Worker still parses `ACCESS_AUD` as a comma-separated list, so a token
minted for any other application in the organisation is refused rather than
quietly accepted.

---

## 5. Fill in the config

In `wrangler.jsonc` → `vars`:

```jsonc
"ACCESS_TEAM": "yourteam",
"ACCESS_AUD": "<aud-tag>"
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
4. Send a forged token:
   ```
   curl -s -o /dev/null -w '%{http_code}\n' \
     -H 'Cf-Access-Jwt-Assertion: not.a.real.token' \
     https://frankkirwan.com/api/admin/songs
   ```
   Expect an Access refusal (302 or 403); never 200.

   Note what this does **not** show. Access rejects the request at the edge
   before the Worker runs, so the 302 is Access talking and `worker/access.js`
   never sees the token — the signature check is not exercised here, and this
   test would pass just the same if it were deleted. Verifying that lock needs
   a request that reaches the Worker with Access satisfied, which means a real
   session; `npm run dev:worker` with `DEV_BYPASS_AUTH` unset is the practical
   place to test it.
5. `curl -I https://artist-site.<your-subdomain>.workers.dev` → should not
   resolve. `workers_dev` is false because Access does not cover that hostname.

---

## 7. First real upload

**Done.** The presigned path ran successfully on 30 July 2026: `pigs` is in the
catalogue with `web_key = web/pigs/6afba3cb.mp3`, and the object in R2 is
5,096,050 bytes, matching `web_bytes` exactly. Presigning, CORS and the direct
browser→R2 PUT are all therefore proven against the real bucket.

What that upload did **not** exercise is the encoder. It was an MP3 under 12MB,
so it took the direct path and skipped conversion entirely — which is the
common case. The transcode path stays untested until there is a WAV or FLAC to
put through it.

If a future upload gives **`SignatureDoesNotMatch`**: the cause is almost always
a `Content-Type` that differs between what the Worker signed and what the
browser sent. Compare `worker/presign.js` against the `content-type` header in
the failing PUT in devtools. If the request fails at the *browser* with an
opaque CORS error instead, step 2's CORS did not apply to that bucket.

### Adding songs without a browser

`/admin` needs a human with an inbox, which makes it useless to a script. For
anything already streamable there is `scripts/add-song.mjs`, which writes to D1
and R2 with wrangler's own credentials:

```
node scripts/add-song.mjs --help
node scripts/add-song.mjs track.mp3 --title "Song name" --remote
```

It reads the duration with `music-metadata` rather than the Web Audio API — on
`guyana-demo-1.mp3` the two agree to 193.515s against the browser's 193.52 — and
it refuses anything needing conversion rather than storing something the player
cannot stream. It also cannot purge the cached `/api/content`, since that cache
lives inside the Worker, so a change takes about a minute to appear rather than
being instant. It bumps `meta.version`, so it is correct throughout, just not
immediate.

---

## Afterwards

- Migrate the nine files still in `public/audio/` into R2 and repoint their
  `web_key`s, then delete them from the repo. `scripts/add-song.mjs` does one in
  a line — `node scripts/add-song.mjs public/audio/releases/reasons.m4a --id
  reasons --remote` — since an existing id keeps its row and replaces only the
  audio.
- Add `pull-snapshot.mjs` as a `prebuild` step so `snapshot.json` refreshes
  from D1 on every deploy.
- Ask Frank for **FLAC** masters rather than WAV. At 150 songs that is roughly
  4.5GB against R2's 10GB free tier, where WAV would be about 8.5GB.
- Before going public: remove the `noindex` meta from `index.html`, and replace
  the remaining placeholder copy (song descriptions, `#` Spotify links, the
  Pigs and Copperfield resumes, `frank@example.com`).
