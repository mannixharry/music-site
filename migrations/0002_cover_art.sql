-- Cover art. Stored exactly like the audio is, and for the same reasons: a
-- public copy in the media bucket that the site serves, and the untouched
-- original kept private in the masters bucket so the public one can be
-- replaced, re-encoded or resized later without that being a one-way door.
--
-- The column is on `songs` with no reference to `kind`, deliberately. Only the
-- singles show their art today, but any song may carry it — so changing a song
-- from `other` to `single` starts showing art that was already uploaded,
-- instead of asking for the file again.
--
-- Apply with:  npm run db:migrate:local   (or db:migrate for the real one)

ALTER TABLE songs ADD COLUMN cover_key           TEXT;     -- what the site shows. NULL = no art, render the placeholder
ALTER TABLE songs ADD COLUMN cover_bytes         INTEGER;
ALTER TABLE songs ADD COLUMN cover_master_key    TEXT;     -- the upload it was made from, in the private bucket
ALTER TABLE songs ADD COLUMN cover_master_bytes  INTEGER;
ALTER TABLE songs ADD COLUMN cover_master_mime   TEXT;
