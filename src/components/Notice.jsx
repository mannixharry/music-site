// A box at the head of an album or musical, saying one thing about it that the
// catalogue itself cannot: that a show is looking for a scriptwriter, that a
// record is out next month, that these demos are rough mixes.
//
// This was ScriptwriterCallout, which said exactly one sentence about exactly
// one musical and was a component because there was nowhere else to put it.
// Now that an album carries a notice of its own (migration 0006), the words are
// data and this is only the box they sit in — so a new musical created from
// /admin can have one without a deploy, which was the whole problem.
//
// Heavy border and a grey fill: the same vocabulary as the players and download
// buttons, turned up. It has to read as an aside about the section rather than
// as the section's first paragraph, and it is the only thing on the page
// allowed to do that.

// Addresses inside the body, made clickable.
//
// The body is a plain textarea in the admin — no markup, no editor, nothing to
// learn — and the one thing that costs is a working link, which the
// scriptwriter callout had. So bare email addresses and http(s) URLs are found
// and turned into anchors, and nothing else is.
//
// Safe by construction rather than by escaping: this builds React elements from
// the matched substrings, so the body is never interpreted as markup. There is
// no innerHTML here and there must not be — the whole point of keeping the
// stored value plain text is that it cannot become a script.
const ADDRESS = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?]|[\w.+-]+@[\w-]+\.[\w.-]+)/g

function linkify(body) {
  return body.split(ADDRESS).map((piece, i) => {
    // split() with one capture group alternates text, match, text, match…, so
    // the odd indices are the addresses and need no second test.
    if (i % 2 === 0) return piece

    const href = piece.includes('@') ? `mailto:${piece}` : piece
    return (
      <a key={i} href={href} className="underline">
        {piece}
      </a>
    )
  })
}

function Notice({ notice }) {
  if (!notice) return null

  return (
    <div className="border-4 border-gray-400 bg-gray-200 p-4">
      <p className="font-bold">{notice.title}</p>
      {/* Blank lines kept: someone typing two paragraphs into a textarea means
          two paragraphs, and collapsing them silently is the kind of small
          betrayal that makes a text box feel unreliable. */}
      {notice.body.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i} className={`text-sm${i === 0 ? ' mt-1' : ' mt-2'}`}>
          {linkify(paragraph)}
        </p>
      ))}
    </div>
  )
}

export default Notice
