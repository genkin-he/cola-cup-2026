import { Controller } from "@hotwired/stimulus"

// Client-side schedule filtering (比赛 / 已结束). "比赛" shows today's and
// future matches by kickoff day; "已结束" shows settled matches across all
// days. Toggles row visibility, recomputes each day's count, hides empty days,
// and shows the empty-state message.
export default class extends Controller {
  static targets = ["tab", "section", "empty"]
  static values = { today: String }

  connect() {
    this.filter = "matches"
    this.apply()
  }

  select(event) {
    this.filter = event.currentTarget.dataset.filter
    this.tabTargets.forEach((tab) => tab.classList.toggle("on", tab === event.currentTarget))
    this.apply()
  }

  apply() {
    let anyVisible = false
    this.sectionTargets.forEach((section) => {
      const dayKey = section.dataset.dayKey
      let count = 0
      section.querySelectorAll("[data-status]").forEach((row) => {
        const show = this.shouldShow(row.dataset.status, dayKey)
        row.hidden = !show
        if (show) count += 1
      })
      const countEl = section.querySelector('[data-schedule-filter-target="count"]')
      if (countEl) countEl.textContent = count
      section.hidden = count === 0
      if (count > 0) anyVisible = true
    })
    if (this.hasEmptyTarget) this.emptyTarget.hidden = anyVisible
  }

  shouldShow(status, dayKey) {
    if (this.filter === "done") return status === "settled"
    return dayKey >= this.todayValue
  }
}
