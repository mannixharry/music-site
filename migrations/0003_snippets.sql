-- Previews. Frank uploads a whole song and publishes only a cut of it.
--
-- The cut is made in the browser, before the upload, and that is the point of
-- the feature rather than a detail of it: media.frankkirwan.com fronts the
-- entire public bucket, so every object in it is downloadable by anyone who
-- knows the key. A start/end pair that the player agreed to honour would leave
-- the complete recording sitting there for anyone who looked. Cropping first
-- means the full track only ever exists in MASTERS, which has no custom domain
-- and no r2.dev URL, and so is not reachable from the web at all.
--
-- `is_snippet` therefore describes what web_key already IS. It does not cause
-- anything to be cut, and clearing it does not restore the full song — that
-- takes uploading the master again without the crop.
--
-- Apply with:  npm run db:migrate:local   (or db:migrate for the real one)

ALTER TABLE songs ADD COLUMN is_snippet      INTEGER NOT NULL DEFAULT 0;

-- Where the cut was taken from, in seconds into the master. Kept so /admin can
-- say what was published without the file to hand; duration_s is the cut's own
-- length, which is what the player shows. Neither is served to visitors — they
-- describe the private object, and belong with the master_* columns.
ALTER TABLE songs ADD COLUMN snippet_start_s REAL;
ALTER TABLE songs ADD COLUMN snippet_end_s   REAL;
