-- The song catalogue. One table for the whole thing: singles, the musicals'
-- demos, and anything else all live here and are told apart by `kind`, because
-- they differ only in where they are shown.
--
-- Apply with:  npm run db:migrate:local   (or db:migrate for the real one)

CREATE TABLE songs (
  id            TEXT PRIMARY KEY,                  -- slug; also the playback slot key and the R2 path
  title         TEXT NOT NULL,                     -- bare title; the "<Musical> — <title>" form is composed at render time
  description   TEXT NOT NULL DEFAULT '',
  kind          TEXT NOT NULL CHECK (kind IN ('single', 'demo', 'other')),
  musical_slug  TEXT,                              -- non-null only when kind = 'demo'
  status        TEXT NOT NULL DEFAULT 'released' CHECK (status IN ('released', 'coming-soon')),

  web_key       TEXT,                              -- what the player streams. NULL = a links-only entry, no player
  web_bytes     INTEGER,
  master_key    TEXT,                              -- the upload it was made from, in the private bucket. NULL = no master held
  master_bytes  INTEGER,
  master_mime   TEXT,
  duration_s    REAL,                              -- seconds, captured at upload; lets the player be preload="none"

  links_json    TEXT NOT NULL DEFAULT '[]',        -- [{label, href}]. Nothing queries by link, so a column beats a table

  -- Sparse (10, 20, 30…) so reordering rewrites one row rather than all of them.
  sort_order    INTEGER NOT NULL,
  published     INTEGER NOT NULL DEFAULT 0,        -- drafts are visible in /admin and nowhere else

  -- Deleting is soft, and nothing ever removes the R2 objects. Between them
  -- that makes an accidental delete recoverable: the row is still here with its
  -- title and links, and the audio it pointed at is still in the bucket.
  deleted_at    TEXT,

  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- The one query /api/content makes.
CREATE INDEX songs_published_order ON songs (published, deleted_at, sort_order);

-- MusicalSection pulling a show's demos.
CREATE INDEX songs_musical ON songs (musical_slug);

-- Single-row-per-key scratch space. Holds 'version', which the client compares
-- against its baked-in snapshot to decide whether the live data is newer.
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO meta (key, value) VALUES ('version', 'empty');
