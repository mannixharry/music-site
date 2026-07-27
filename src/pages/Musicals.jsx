import MusicalSection from '../components/MusicalSection'
import { musicals } from '../content/musicals'

function Musicals() {
  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold">Musicals</h1>

      {musicals.map((musical, i) => (
        <div key={musical.slug}>
          {i > 0 && <hr className="mt-4 border-gray-300" />}
          <MusicalSection musical={musical} />
        </div>
      ))}
    </div>
  )
}

export default Musicals
