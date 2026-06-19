import { Controller } from "@hotwired/stimulus"

// A back link that returns to the previous page — restoring its scroll position
// via Turbo's restoration visit — instead of navigating fresh to its href. When
// there's no in-app history to pop (opened directly or in a new tab), it falls
// back to the link's href.
export default class extends Controller {
  go(event) {
    if (window.history.length > 1) {
      event.preventDefault()
      window.history.back()
    }
  }
}
