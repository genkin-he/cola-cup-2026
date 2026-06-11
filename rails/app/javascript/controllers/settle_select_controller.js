import { Controller } from "@hotwired/stimulus"

// Tracks the to-settle checkboxes and drives the sticky "结算选中（N 场）" bar.
export default class extends Controller {
  static targets = ["checkbox", "bar", "count"]

  connect() {
    this.update()
  }

  update() {
    const selected = this.checkboxTargets.filter((box) => box.checked).length
    if (this.hasCountTarget) this.countTarget.textContent = selected
    if (this.hasBarTarget) this.barTarget.hidden = selected === 0
  }
}
