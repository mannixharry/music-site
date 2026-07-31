import PageImages from '../components/PageImages'
import { contact, contactImages, instagramUrl, mailtoUrl } from '../content/contact'
import { usePageMeta } from '../usePageMeta'

function Contact() {
  usePageMeta({
    title: 'Contact',
    description:
      'How to reach Frank Kirwan. Email is the surest way.',
  })

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold">Contact</h1>
      <p className="mt-2 text-sm leading-relaxed">{contact.intro}</p>

      <dl className="mt-8 space-y-4 text-sm">
        <div>
          <dt className="font-bold">Email</dt>
          <dd className="mt-1">
            <a href={mailtoUrl} className="underline">
              {contact.email}
            </a>
          </dd>
        </div>

        <div>
          <dt className="font-bold">Instagram</dt>
          <dd className="mt-1">
            <a href={instagramUrl} className="underline" target="_blank" rel="noreferrer">
              @{contact.instagramHandle}
            </a>
          </dd>
        </div>
      </dl>

      <PageImages images={contactImages} />
    </div>
  )
}

export default Contact
