import { Controller } from "@hotwired/stimulus"

// Profile settings form: live avatar/name preview, emoji grid toggle, and a
// save button that stays disabled until the nickname is non-blank AND something
// changed (dirty). Mirrors the legacy ProfileForm.
export default class extends Controller {
  static targets = ["preview", "namePreview", "nickname", "emojiInput", "submit"]

  connect() {
    this.initialNickname = this.nicknameTarget.value
    this.initialEmoji = this.emojiInputTarget.value
    this.refresh()
  }

  pick(event) {
    const choice = event.currentTarget.dataset.emoji
    const next = choice === this.emojiInputTarget.value ? "" : choice
    this.emojiInputTarget.value = next
    this.element.querySelectorAll(".emoji-grid button").forEach((button) => {
      button.classList.toggle("sel", next !== "" && button.dataset.emoji === next)
    })
    this.refresh()
  }

  refresh() {
    const nickname = this.nicknameTarget.value
    const emoji = this.emojiInputTarget.value
    this.previewTarget.textContent = emoji || "👤"
    this.namePreviewTarget.textContent = nickname || "你"
    const dirty = nickname !== this.initialNickname || emoji !== this.initialEmoji
    this.submitTarget.disabled = nickname.trim() === "" || !dirty
  }
}
