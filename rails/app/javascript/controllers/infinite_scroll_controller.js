import { Controller } from "@hotwired/stimulus"

// Generic infinite scroll. Attached to a sentinel element at the tail of a list;
// when the sentinel scrolls into view it fetches the next page (a layout-less
// HTML fragment of rows) and inserts the rows just before itself, skipping any
// whose id is already in the DOM (dedupe — survives offset shifts and overlap
// with broadcast-replaced rows). The fragment carries the next page URL in a
// [data-next-url] marker; when that marker is absent there are no more pages, so
// the observer disconnects and the sentinel removes itself.
export default class extends Controller {
  static values = { url: String }

  connect() {
    this.loading = false
    this.observer = new IntersectionObserver(
      (entries) => { if (entries.some((entry) => entry.isIntersecting)) this.load() },
      { rootMargin: "200px" }
    )
    this.observer.observe(this.element)
  }

  disconnect() {
    this.observer?.disconnect()
  }

  async load() {
    if (this.loading || !this.urlValue) return
    this.loading = true
    try {
      const response = await fetch(this.urlValue, { headers: { Accept: "text/html" } })
      if (!response.ok) return
      const fragment = document.createRange().createContextualFragment(await response.text())

      const marker = fragment.querySelector("[data-next-url]")
      const nextUrl = marker?.getAttribute("data-next-url")
      marker?.remove()

      fragment.querySelectorAll("[id]").forEach((row) => {
        if (!document.getElementById(row.id)) this.element.before(row)
      })

      this.dispatch("loaded")

      if (nextUrl) {
        this.urlValue = nextUrl
      } else {
        this.observer.disconnect()
        this.element.remove()
      }
    } finally {
      this.loading = false
    }
  }
}
