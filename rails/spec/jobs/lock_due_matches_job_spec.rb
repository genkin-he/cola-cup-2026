require "rails_helper"

RSpec.describe LockDueMatchesJob do
  let!(:home) { create(:team, name: "Home FC") }
  let!(:away) { create(:team, name: "Away FC") }

  def market_snapshot_for(match)
    match.odds_snapshots.create!(
      source: "polymarket", locked: false,
      p_home: 0.6, p_away: 0.4, d_home: 1.7, d_away: 2.5, taken_at: Time.current
    )
  end

  it "locks the market odds for matches whose voting window has closed" do
    due = create(:match, home_team: home, away_team: away, kickoff_at: 30.minutes.from_now)
    market_snapshot_for(due)

    expect { LockDueMatchesJob.perform_now }
      .to change { due.odds_snapshots.where(locked: true, source: "polymarket").count }.from(0).to(1)
  end

  it "is idempotent — a second run adds no further locked snapshot" do
    due = create(:match, home_team: home, away_team: away, kickoff_at: 30.minutes.from_now)
    market_snapshot_for(due)
    LockDueMatchesJob.perform_now

    expect { LockDueMatchesJob.perform_now }
      .not_to(change { due.odds_snapshots.where(locked: true).count })
  end

  it "leaves matches outside the lock window untouched" do
    future = create(:match, home_team: home, away_team: away, kickoff_at: 10.days.from_now)
    market_snapshot_for(future)

    LockDueMatchesJob.perform_now

    expect(future.odds_snapshots.where(locked: true).count).to eq(0)
  end
end
