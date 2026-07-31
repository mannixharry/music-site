-- A notice, and a musical's downloads, as data rather than as code.
--
-- Both were in src/content/musicals.js, which was the right call while there
-- were exactly three musicals and no way to edit anything without a deploy.
-- It stopped being right the moment Frank could create an album from /admin:
-- a new musical came out with no downloads and no way to add any, and the
-- admin had to tell him so — "also needs its synopsis and downloads adding to
-- src/content/musicals.js" — which is an instruction to open an editor.
--
-- Two things move here, and only two. The long resume stays in the repo: it is
-- several screens of prose per show, it changes about once a year, and it is
-- the one thing a textarea in a browser is a bad place to keep.
--
--   notice_*        a box at the head of an album or musical. Any album may
--                   have one; it is what the Guyana Skies "needs a
--                   scriptwriter" callout was, generalised to a title and a
--                   body so it can also say a record is out next month.
--
--   downloads_json  scripts and scores. MUSICALS ONLY, enforced in
--                   worker/validate.js — an album is a set of recordings and
--                   has nothing to hand over.
--
-- Downloads name files already in public/ (or any http/mailto address); this
-- is metadata, not an upload path. Their sizes are still stamped at build time
-- by scripts/stamp-download-sizes.mjs, which looks them up by href, so a
-- download added here shows its size without anything else changing.
--
-- Empty strings and '[]' rather than NULL, for the reason `subtitle` already
-- is: nothing should have to think about which of the two it is holding.
--
-- Apply with:  npm run db:migrate:local   (or db:migrate for the real one)

ALTER TABLE albums ADD COLUMN notice_title TEXT NOT NULL DEFAULT '';
ALTER TABLE albums ADD COLUMN notice_body TEXT NOT NULL DEFAULT '';
ALTER TABLE albums ADD COLUMN downloads_json TEXT NOT NULL DEFAULT '[]';

-- The three musicals as they already render, so this migration changes the
-- database and nothing on the site. Taken verbatim from what was in
-- src/content/musicals.js and src/components/ScriptwriterCallout.jsx.

UPDATE albums
SET downloads_json = json_array(
      json_object('label', 'Script (PDF)', 'href', '/scripts/frank-kirwan-pigs-script.pdf')
    )
WHERE id = 'pigs';

UPDATE albums
SET downloads_json = json_array(
      json_object('label', 'Script (PDF)',
                  'href', '/scripts/frank-kirwan-copperfield-and-co-script.pdf'),
      json_object('label', 'Score (PDF)',
                  'href', '/scores/frank-kirwan-copperfield-and-co.pdf'),
      -- `download` forces a save rather than letting the browser try to render
      -- a Sibelius file it has no idea what to do with.
      json_object('label', 'Sibelius score',
                  'href', '/scores/frank-kirwan-copperfield-and-co.sib',
                  'download', json('true'))
    )
WHERE id = 'copperfield-co';

-- The callout that was a component of its own, now a row like any other. The
-- address is written out because a notice is text; contact.js remains the one
-- place the site's own links are built from.
UPDATE albums
SET notice_title = 'This musical needs a scriptwriter.',
    notice_body  = 'Guyana Skies has demos and a prospective synopsis, but no script yet — '
                || 'if that''s you, get in touch: frank@frankkirwan.com'
WHERE id = 'guyana-skies';

-- Albums carry two new public fields, so every client's cached copy is stale.
UPDATE meta SET value = 'notices-' || strftime('%s', 'now') WHERE key = 'version';
