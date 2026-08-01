-- Which songs the home page shows, as a column rather than as an inference.
--
-- "Single" was never a property a song carried: it was what belonging to no
-- album *meant*, and the home page's Music section was `album_id IS NULL`. That
-- worked while the two questions had one answer, and stopped working the moment
-- Frank wanted a song from a record on the front page — the only way to put it
-- there was to take it out of the record it belongs to, which is a lie about
-- the catalogue told to fix a layout.
--
-- So they become two questions. `album_id` says what a song belongs to; this
-- says whether the home page shows it. Any song may be on the home page,
-- whatever it belongs to, and /songs still files it under its album.
--
-- The backfill is what makes this migration invisible: every song currently on
-- the home page is exactly every song in no album, so that is what is turned on.
-- Deleted rows are included — a restored song should come back the way it went.
--
-- Apply with:  npm run db:migrate:local   (or db:migrate for the real one)
--
-- AND MIND THE ORDER: this adds a column /api/content returns, so it goes to
-- the real database *before* `npm run deploy`. `prebuild` pulls the snapshot
-- from the live API, so deploying first bakes a snapshot with the old shape
-- into the bundle and the home page renders empty until the API answers.

ALTER TABLE songs ADD COLUMN on_homepage INTEGER NOT NULL DEFAULT 0;

UPDATE songs SET on_homepage = 1 WHERE album_id IS NULL;

-- Songs carry a new public field, so every client's cached copy is stale.
UPDATE meta SET value = 'homepage-' || strftime('%s', 'now') WHERE key = 'version';
