function Placeholder({ label, dims, aspect = '', className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 border border-dashed border-gray-400 bg-gray-100 p-2 text-center ${aspect} ${className}`}
    >
      <span className="font-mono text-xs text-black">{label}</span>
      {dims && <span className="font-mono text-xs text-black">{dims}</span>}
    </div>
  )
}

export default Placeholder
