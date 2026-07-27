import Placeholder from './Placeholder'

// "Only one plays at a time" state will live in a shared context/hook
// (e.g. a currently-playing-id provider) added in the real-playback step.
// This component stays presentational until then.
function AudioPlayer({ title, meta, duration }) {
  return (
    <div className="flex h-16 items-center gap-3 border border-gray-300 bg-gray-100 px-3">
      <Placeholder label="play" className="h-10 w-10 shrink-0 p-0" />
      <span className="w-32 shrink-0 truncate text-sm">
        {title}
        {meta && <span className="ml-2 text-xs">{meta}</span>}
      </span>
      <Placeholder label="scrub bar" className="h-6 flex-1 p-0" />
      <span className="shrink-0 font-mono text-xs">{duration}</span>
    </div>
  )
}

export default AudioPlayer
