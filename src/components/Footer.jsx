import { contact, mailtoUrl } from '../content/contact'

function Footer() {
  return (
    <footer className="border-t border-gray-300 bg-gray-100">
      <div className="mx-auto max-w-2xl px-4 py-6 text-sm">
        <p className="font-bold">Frank Kirwan</p>
        <p>
          <a href={mailtoUrl} className="underline">
            {contact.email}
          </a>
        </p>
        <p>&copy; {new Date().getFullYear()} Frank Kirwan</p>
      </div>
    </footer>
  )
}

export default Footer
