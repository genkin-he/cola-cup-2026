import { Controller } from "@hotwired/stimulus"

// The settlement preview modal. Toggling a roster checkbox re-submits the form
// to the preview endpoint so payouts are recomputed server-side; clicking the
// backdrop dismisses the sheet.
export default class extends Controller {
  static targets = ["form", "recompute"]

  backdrop() {
    this.element.remove()
  }

  stop(event) {
    event.stopPropagation()
  }

  recompute() {
    if (this.hasFormTarget && this.hasRecomputeTarget) {
      this.formTarget.requestSubmit(this.recomputeTarget)
    }
  }
}
