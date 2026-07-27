function ScriptwriterCallout({ contactHref }) {
  return (
    <div className="border-4 border-gray-400 bg-gray-200 p-4">
      <p className="font-bold">This musical needs a scriptwriter.</p>
      <p className="text-sm">
        Guyana Skies has demos and a prospective synopsis, but no script yet — if that&apos;s you, get in touch.
      </p>
      <a href={contactHref} className="mt-2 inline-block underline">
        Get in touch
      </a>
    </div>
  )
}

export default ScriptwriterCallout
