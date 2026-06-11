import { Controller } from "@hotwired/stimulus"

const EPSILON = 1e-9

// Per-drink quantity stepper. The ± buttons clamp at 1, the hidden qty field
// and the submit label ("兑换 · X") stay in sync, and the submit button is
// disabled when the total cost exceeds the available balance. Mirrors the
// legacy RedeemPanel client logic.
export default class extends Controller {
  static targets = ["qty", "qtyInput", "submit", "dec"]
  static values = {
    cost: Number,
    balance: Number,
    qty: { type: Number, default: 1 },
  }

  connect() {
    this.render()
  }

  inc() {
    this.qtyValue = this.qtyValue + 1
  }

  dec() {
    this.qtyValue = Math.max(1, this.qtyValue - 1)
  }

  qtyValueChanged() {
    this.render()
  }

  render() {
    const qty = Math.max(1, this.qtyValue)
    const total = this.costValue * qty
    this.qtyTarget.textContent = qty
    this.qtyInputTarget.value = qty
    this.submitTarget.textContent = `兑换 · ${this.format(total)}`
    this.submitTarget.disabled = this.balanceValue + EPSILON < total
    if (this.hasDecTarget) this.decTarget.disabled = qty <= 1
  }

  format(value) {
    return value % 1 === 0 ? String(value) : value.toFixed(1)
  }
}
