-- Whether the album's own listing leaves a song out, which is the third thing
-- 0007 turned out to have collapsed.
--
-- 0007 split "what a song belongs to" from "where the home page shows it", so a
-- snapshot cut from a record can sit on the front page without leaving the
-- record. What it left behind is the other half of that: the snapshot is still
-- one of the record's songs, so /songs and the musical's demo list draw it
-- alongside the full track it was cut from — the same song twice, once whole
-- and once as twenty seconds of itself.
--
-- So this says the listing skips it. It is not a second way of unpublishing:
-- the song keeps its album, keeps the album's name in its composed title, and
-- the now-playing strip still offers the way through to the record. Only the
-- record's own list of songs leaves it out.
--
-- Default 0, and no backfill: every song currently in an album is listed there,
-- so this migration changes the database and nothing on the site.
--
-- Apply with:  npm run db:migrate:local   (or db:migrate for the real one)
--
-- AND MIND THE ORDER, as with 0007: this adds a column /api/content returns, so
-- it goes to the real database *before* `npm run deploy`. `prebuild` pulls the
-- snapshot from the live API, so deploying first bakes a snapshot with the old
-- shape into the bundle.

ALTER TABLE songs ADD COLUMN hide_in_album INTEGER NOT NULL DEFAULT 0;

-- Songs carry a new public field, so every client's cached copy is stale.
UPDATE meta SET value = 'hide-in-album-' || strftime('%s', 'now') WHERE key = 'version';
