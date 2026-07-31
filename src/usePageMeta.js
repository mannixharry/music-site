import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import portrait from './images/frank-kirwan-1000.jpg'

const SITE = 'Frank Kirwan'
const ORIGIN = 'https://frankkirwan.com'

// Everything the browser and everyone else reads about a page but never shows
// on it: the tab label, the sentence a search result quotes, the card that
// appears when the address is pasted into a message, and which URL is the real
// one.
//
// All of it has to be written from JavaScript, because this is a single-page
// site: one index.html is served for every address, so anything baked into that
// file describes the whole site or nothing. A crawler that runs scripts reads
// what we set here. One that does not sees the defaults in index.html, which is
// why those are the home page's own values rather than something generic.
//
// Kept in one hook rather than scattered, so a new page cannot quietly ship
// without any of it.

function upsert(selector, create) {
  let node = document.head.querySelector(selector)
  if (!node) {
    node = create()
    document.head.append(node)
  }
  return node
}

function setMeta(attr, key, content) {
  const node = upsert(`meta[${attr}="${key}"]`, () => {
    const el = document.createElement('meta')
    el.setAttribute(attr, key)
    return el
  })
  node.setAttribute('content', content)
}

export function usePageMeta({ title, description, image = portrait }) {
  const { pathname } = useLocation()

  useEffect(() => {
    const full = title ? `${title} — ${SITE}` : SITE
    // A tab strip crops from the right, so the distinguishing part goes first.
    document.title = full

    // Trailing slashes and www. are different addresses to a crawler and the
    // same page to a reader. This says which one to count.
    const canonical = ORIGIN + (pathname === '/' ? '/' : pathname.replace(/\/$/, ''))
    upsert('link[rel="canonical"]', () => {
      const el = document.createElement('link')
      el.rel = 'canonical'
      return el
    }).setAttribute('href', canonical)

    setMeta('name', 'description', description)

    // Open Graph is what WhatsApp, Messages, Slack and Facebook read; Twitter
    // reads its own unless told otherwise, and `summary_large_image` is the
    // difference between a thumbnail and a card worth looking at.
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', SITE)
    setMeta('property', 'og:title', full)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', canonical)
    setMeta('name', 'twitter:card', 'summary_large_image')

    if (image) {
      setMeta('property', 'og:image', ORIGIN + image)
      // Named, because a portrait of Frank is the sort of image a screen reader
      // user gets read to them when someone shares the link.
      setMeta('property', 'og:image:alt', 'Frank Kirwan with his guitar')
    }
  }, [title, description, image, pathname])
}
