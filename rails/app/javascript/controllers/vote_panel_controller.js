import { Controller } from "@hotwired/stimulus"

// Vote panel picker: highlights the chosen side, computes the potential payout
// from that side's crowd odds (data-odds), and keeps the submit button disabled
// until the selection differs from the saved pick. Mirrors the legacy VotePanel.
export default class extends Controller {
  static targets = ["pick", "pickInput", "pot", "submit"]
  static values = { stake: Number, confirmed: String }

  connect() {
    this.selected = this.confirmedValue || ""
    this.render()
  }

  select(event) {
    this.selected = event.currentTarget.dataset.pick
    this.pickInputTarget.value = this.selected
    this.pickTargets.forEach((p) => p.classList.toggle("sel", p.dataset.pick === this.selected))
    this.render()
  }

  render() {
    const button = this.pickTargets.find((p) => p.dataset.pick === this.selected)
    const label = button ? button.dataset.label : ""
    // data-odds is the pool decimal AS IF this stake sits on the side; odds of 1
    // means no opposing pool yet, so a selected side still shows +0.0 瓶.
    const odds = button ? parseFloat(button.dataset.odds) : NaN
    const potential = button && isFinite(odds) ? this.stakeValue * (odds - 1) : null

    if (potential != null) {
      const amount = document.createElement("b")
      amount.textContent = `+${potential.toFixed(1)} 瓶`
      this.potTarget.replaceChildren("猜中约赢 ", amount, " · 按当前预测赔率")
    } else {
      this.potTarget.textContent = "选个看好的"
    }

    const unchanged = this.selected !== "" && this.selected === this.confirmedValue
    if (!this.selected) {
      this.submitTarget.textContent = "🥤 选个看好的"
    } else if (unchanged) {
      this.submitTarget.textContent = `✅ 当前已预测 ${label}`
    } else {
      this.submitTarget.textContent = `🥤 提交预测 · ${label} · ${this.bottles(this.stakeValue)} 瓶`
    }
    this.submitTarget.style.fontSize = this.ctaFontSize(label)
    this.submitTarget.disabled = !this.selected || unchanged
  }

  // Shrink the full-width CTA for long country names so it stays on one line
  // instead of wrapping and growing taller; "" falls back to the CSS default.
  ctaFontSize(label) {
    const length = label ? [...label].length : 0
    if (length <= 4) return ""
    if (length <= 6) return "16px"
    return "13px"
  }

  bottles(value) {
    return value % 1 === 0 ? String(value) : value.toFixed(1)
  }
}
