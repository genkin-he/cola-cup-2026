import { Controller } from "@hotwired/stimulus"

// Disables the vote form once the voting window closes (data-closes-at), so a
// page left open past the 1h-before-kickoff cutoff can't submit a stale vote —
// the server enforces the same guard, this just reflects it in the UI.
export default class extends Controller {
  static values = { closesAt: String }

  connect() {
    const closes = Date.parse(this.closesAtValue)
    if (isNaN(closes)) return

    const remaining = closes - Date.now()
    if (remaining <= 0) {
      this.lock()
    } else {
      this.timer = setTimeout(() => this.lock(), remaining)
    }
  }

  disconnect() {
    if (this.timer) clearTimeout(this.timer)
  }

  lock() {
    this.element.querySelectorAll("button, input").forEach((el) => { el.disabled = true })
  }
}
