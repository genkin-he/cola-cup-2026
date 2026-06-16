import { Controller } from "@hotwired/stimulus"

// Marks the signed-in viewer's leaderboard row with the 「你」 badge. Broadcast
// HTML is rendered without a session, so the badge is applied client-side from
// the current-user-id meta tag (idempotent: skips if already present). `refresh`
// re-applies it after infinite scroll appends more rows.
export default class extends Controller {
  connect() {
    this.apply()
  }

  refresh() {
    this.apply()
  }

  apply() {
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
