-- Albums: a named group of songs, with a cover of its own.
--
-- A musical is an album with `kind = 'musical'`. That is the whole of the
-- difference in this table — the musicals' long editorial copy (synopsis,
-- downloads, the scriptwriter callout) stays in src/content/musicals.js, keyed
-- by the album's id, because it is prose that changes about once a year and
-- belongs in the repo rather than in a text column.
--
-- Everything a song already knew about its musical, it now knows about its
-- album: `musical_slug` becomes `album_id`, and the three musicals become the
-- first three rows here. The old column is left in place rather than dropped —
-- it costs nothing, and dropping a column that a rolled-back Worker might still
-- read is the kind of migration that cannot be undone in a hurry. Nothing
-- writes it any more.
--
-- Apply with:  npm run db:migrate:local   (or db:migrate for the real one)

CREATE TABLE albums (
  id          TEXT PRIMARY KEY,                    -- slug; also the R2 path for its cover
  title       TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('album', 'musical')),

  -- The line under the title: "Previously published by Warner Chappell",
  -- "Recorded at home, 2024". Optional, and empty rather than NULL so nothing
  -- has to think about which of the two it is holding.
  subtitle    TEXT NOT NULL DEFAULT '',

  -- Stored exactly as a song's art is: a public copy the site serves, and the
  -- untouched original kept private so the public one can be replaced later.
  -- A song with no cover of its own falls back to this one.
  cover_key          TEXT,
  cover_bytes        INTEGER,
  cover_master_key   TEXT,
  cover_master_bytes INTEGER,
  cover_master_mime  TEXT,

  -- Sparse (10, 20, 30…) so reordering rewrites one row rather than all of them.
  sort_order  INTEGER NOT NULL,
  published   INTEGER NOT NULL DEFAULT 0,          -- drafts are visible in /admin and nowhere else

  -- Soft, like a song's. An album is only a grouping, so deleting one must not
  -- take its songs with it: they are left without an album, which is a state
  -- the site already knows how to show.
  deleted_at  TEXT,

  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX albums_published_order ON albums (published, deleted_at, sort_order);

ALTER TABLE songs ADD COLUMN album_id TEXT;

CREATE INDEX songs_album ON songs (album_id);

-- The three musicals, as albums. Ids match the slugs already stored on their
-- demos and written into src/content/musicals.js, so the backfill below is a
-- straight copy and the editorial copy keeps finding its show.
INSERT INTO albums (id, title, kind, subtitle, sort_order, published, created_at, updated_at)
VALUES
  ('pigs', 'Pigs', 'musical', 'Previously published by Warner Chappell', 10, 1,
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('copperfield-co', 'Copperfield & Co.', 'musical', 'Previously published by Warner Chappell', 20, 1,
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('guyana-skies', 'Guyana Skies', 'musical', 'Windrush-inspired — in development', 30, 1,
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

UPDATE songs SET album_id = musical_slug WHERE musical_slug IS NOT NULL AND musical_slug != '';

-- The catalogue has changed shape, so every client's cached copy is stale.
UPDATE meta SET value = 'albums-' || strftime('%s', 'now') WHERE key = 'version';
