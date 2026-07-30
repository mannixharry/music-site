// Says a track is a cut rather than the whole song, quietly. Small caps and a
// hairline border — the same vocabulary as the players and download buttons
// around it — so it reads as a label on the title rather than a warning about
// it. Someone who does not care what it says should be able to ignore it.
//
// It carries its own text for screen readers because "Preview" beside a title
// is only unambiguous if you can see which title it is beside.
function SnippetTag({ title }) {
  return (
    <span
      className="shrink-0 border border-gray-400 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider text-gray-600"
      title={`Only a preview of ${title} is on the site`}
    >
      Preview
    </span>
  )
}

export default SnippetTag
