import PagePhoto from '../components/PagePhoto'
import { contact, instagramUrl, mailtoUrl } from '../content/contact'
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

      {/* Landscape, so it runs the width of the column rather than sitting in
          the half-width slot the portrait placeholder used to hold. */}
      <PagePhoto
        name="contact-guitar"
        className="mt-10"
        sizes="(min-width: 44rem) 672px, calc(100vw - 2rem)"
      />
    </div>
  )
}

export default Contact
