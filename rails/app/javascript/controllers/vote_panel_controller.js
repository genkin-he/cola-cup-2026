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
    const odds = button ? parseFloat(button.dataset.odds) : NaN
    const potential = button && isFinite(odds) && odds > 0 ? this.stakeValue * (odds - 1) : null

    if (potential != null) {
      const amount = document.createElement("b")
      amount.textContent = `+${potential.toFixed(1)} 瓶`
      const hint = document.createElement("span")
      hint.style.color = "var(--low)"
      hint.style.fontSize = "12px"
      hint.textContent = "零头会累计，攒满 1 瓶即可领"
      this.potTarget.replaceChildren("猜中约赢 ", amount, " · 按当前预测赔率", document.createElement("br"), hint)
    } else {
      this.potTarget.textContent = "选个看好的"
    }

    const unchanged = this.selected !== "" && this.selected === this.confirmedValue
    if (!this.selected) {
      this.submitTarget.textContent = "🥤 选个看好的"
    } else if (unchanged) {
      this.submitTarget.textContent = `✅ 当前已预测 ${button.dataset.label}`
    } else {
      this.submitTarget.textContent = `🥤 提交预测 · ${button.dataset.label} · ${this.bottles(this.stakeValue)} 瓶`
    }
    this.submitTarget.disabled = !this.selected || unchanged
  }

  bottles(value) {
    return value % 1 === 0 ? String(value) : value.toFixed(1)
  }
}
