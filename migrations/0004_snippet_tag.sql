-- Whether a preview says so on the website.
--
-- `is_snippet` records what the published audio *is*; this records whether to
-- announce it. They are separate because the first is a fact about the file and
-- the second is an editorial choice — a snapshot from a musical is understood
-- to be an extract and labelling it adds nothing, while a single cut down to
-- thirty seconds probably wants saying.
--
-- Defaults to 0, so the label is opt-in per song and nothing starts shouting
-- about itself. Songs that are already previews therefore lose the label they
-- had until it is asked for.
--
-- Apply with:  npm run db:migrate:local   (or db:migrate for the real one)

ALTER TABLE songs ADD COLUMN show_snippet_tag INTEGER NOT NULL DEFAULT 0;
