import { Controller } from "@hotwired/stimulus"

// Marks the signed-in viewer's leaderboard row with the 「你」 badge. Broadcast
// HTML is rendered without a session, so the badge is applied client-side from
// the current-user-id meta tag (idempotent: skips if the server already added it).
export default class extends Controller {
  connect() {
    const meta = document.querySelector('meta[name="current-user-id"]')
    const id = meta && meta.content
    if (!id) return

    const row = this.element.querySelector(`[data-user-id="${id}"]`)
    const name = row && row.querySelector(".nm")
    if (name && !name.querySelector(".you")) {
      const badge = document.createElement("span")
      badge.className = "you"
      badge.textContent = "你"
      name.appendChild(badge)
    }
  }
}
