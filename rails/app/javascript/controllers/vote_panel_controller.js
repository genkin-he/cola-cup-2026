import { Controller } from "@hotwired/stimulus"

// Vote panel picker: highlights the chosen side and bottle amount, computes the
// potential payout live from the crowd pool (data-others + others-total) for the
// selected stake, and keeps the submit button disabled until the side or amount
// differs from the saved vote. Mirrors the legacy VotePanel.
export default class extends Controller {
  static targets = ["pick", "pickInput", "stake", "stakeInput", "pot", "submit"]
  static values = {
    confirmed: String,
    confirmedStake: Number,
    defaultStake: Number,
    othersTotal: Number,
  }

  connect() {
    this.selected = this.confirmedValue || ""
    this.selectedStake = this.confirmedStakeValue || this.defaultStakeValue
    this.render()
  }

  select(event) {
    this.selected = event.currentTarget.dataset.pick
    this.pickInputTarget.value = this.selected
    this.pickTargets.forEach((p) => p.classList.toggle("sel", p.dataset.pick === this.selected))
    this.render()
  }

  selectStake(event) {
    this.selectedStake = parseFloat(event.currentTarget.dataset.stake)
    this.stakeInputTarget.value = this.selectedStake
    this.stakeTargets.forEach((s) =>
      s.classList.toggle("sel", parseFloat(s.dataset.stake) === this.selectedStake),
    )
    this.render()
  }

  render() {
    const button = this.pickTargets.find((p) => p.dataset.pick === this.selected)
    const label = button ? button.dataset.label : ""
    // Pari-mutuel payout for THIS stake against the crowd pool with the viewer
    // removed: winnings = stake * (others_total - others_on_pick) / (others_on_pick + stake).
    // No opposing pool yet (others_total == others_on_pick) means +0.0 瓶.
    const stake = this.selectedStake
    let potential = null
    if (button) {
      const othersOnPick = parseFloat(button.dataset.others) || 0
      const othersTotal = this.othersTotalValue
      potential = (stake * (othersTotal - othersOnPick)) / (othersOnPick + stake)
    }

    if (potential != null) {
      const amount = document.createElement("b")
      amount.textContent = `+${potential.toFixed(1)} 瓶`
      this.potTarget.replaceChildren("猜中约赢 ", amount, " · 按当前预测赔率")
    } else {
      this.potTarget.textContent = "选个看好的"
    }

    const unchanged =
      this.selected !== "" &&
      this.selected === this.confirmedValue &&
      this.selectedStake === this.confirmedStakeValue
    const actionable = this.selected !== "" && !unchanged
    if (!this.selected) {
      this.submitTarget.textContent = "🥤 选个看好的"
    } else if (unchanged) {
      this.submitTarget.textContent = `✅ 当前已预测 ${label}`
    } else {
      this.submitTarget.textContent = `🥤 提交预测 · ${label} · ${this.bottles(stake)} 瓶`
    }
    this.submitTarget.style.fontSize = this.ctaFontSize(label)
    // Red fill only for a submittable change; the "already predicted" / "pick one"
    // states stay a calm outline so they don't dominate the panel.
    this.submitTarget.classList.toggle("outline", !actionable)
    this.submitTarget.disabled = !actionable
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
