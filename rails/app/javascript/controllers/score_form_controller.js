import { Controller } from "@hotwired/stimulus"

// Live score-entry helper: derives the result from the scoreline, reveals the
// advancer pills only on a knockout tie, and disables save until the entry is
// complete. Mirrors the legacy AdminPanel TodoRow logic.
export default class extends Controller {
  static targets = ["home", "away", "koLabel", "koPill", "koRadio", "resultTag", "resultLabel", "save"]
  static values = { knockout: Boolean, homeName: String, awayName: String }

  connect() {
    this.recompute()
  }

  recompute() {
    const home = this.parse(this.homeTarget.value)
    const away = this.parse(this.awayTarget.value)
    const valid = home !== null && away !== null
    const knockoutTie = valid && home === away && this.knockoutValue

    this.koLabelTargets.forEach((el) => (el.hidden = !knockoutTie))
    this.koPillTargets.forEach((el) => (el.hidden = !knockoutTie))

    let result = null
    if (valid) {
      if (home > away) result = "home"
      else if (home < away) result = "away"
      else result = this.knockoutValue ? this.checkedAdvancer() : "draw"
    }

    const label =
      result === "home" ? this.homeNameValue
      : result === "away" ? this.awayNameValue
      : result === "draw" ? "平局"
      : null

    if (this.hasResultTagTarget) {
      this.resultTagTarget.hidden = !label
      if (label && this.hasResultLabelTarget) this.resultLabelTarget.textContent = label
    }
    if (this.hasSaveTarget) {
      this.saveTarget.disabled = !valid || (knockoutTie && !this.checkedAdvancer())
    }
  }

  checkedAdvancer() {
    const picked = this.koRadioTargets.find((radio) => radio.checked)
    return picked ? picked.value : null
  }

  parse(value) {
    const trimmed = value.trim()
    if (trimmed === "") return null
    const number = Number(trimmed)
    return Number.isFinite(number) ? number : null
  }
}
