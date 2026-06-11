import { Controller } from "@hotwired/stimulus"

// 待结算 / 结算记录 subtab switch. Without JS both panels render; on connect we
// collapse to the default "todo" panel.
export default class extends Controller {
  static targets = ["tab", "panel"]

  connect() {
    this.activate("todo")
  }

  show(event) {
    this.activate(event.currentTarget.dataset.tab)
  }

  activate(key) {
    this.tabTargets.forEach((tab) => tab.classList.toggle("on", tab.dataset.tab === key))
    this.panelTargets.forEach((panel) => (panel.hidden = panel.dataset.tab !== key))
  }
}
