require "rails_helper"

RSpec.describe Standings::Group do
  def finished(home, away, home_score, away_score, group: "Group A")
    result = { 1 => "home", 0 => "draw", -1 => "away" }[home_score <=> away_score]
    create(:match, stage: "group", group_name: group,
      home_team: home, away_team: away,
      home_score: home_score, away_score: away_score,
      result: result, result_at: Time.current, settled: true)
  end

  def upcoming(home, away, group: "Group A")
    create(:match, stage: "group", group_name: group,
      home_team: home, away_team: away, kickoff_at: 3.days.from_now)
  end

  let(:alpha) { create(:team, name: "Alpha") }
  let(:bravo) { create(:team, name: "Bravo") }
  let(:charlie) { create(:team, name: "Charlie") }
  let(:delta) { create(:team, name: "Delta") }

  describe "#rows" do
    before do
      finished(alpha, bravo, 2, 0)
      finished(charlie, delta, 1, 1)
      finished(alpha, charlie, 1, 0)
      finished(bravo, delta, 0, 0)
      upcoming(alpha, delta)
      upcoming(bravo, charlie)
    end

    let(:rows) { described_class.find("A").rows }

    it "ranks by points, then goal difference" do
      expect(rows.map(&:name)).to eq(%w[Alpha Delta Charlie Bravo])
    end

    it "tallies points and goals from finished matches only" do
      top = rows.first
      expect(top.team_id).to eq(alpha.id)
      expect(top.played).to eq(2)
      expect(top.won).to eq(2)
      expect(top.points).to eq(6)
      expect(top.goals_for).to eq(3)
      expect(top.goals_against).to eq(0)
      expect(top.goal_diff).to eq(3)
    end

    it "credits a draw to both sides" do
      delta_row = rows.find { |row| row.team_id == delta.id }
      expect(delta_row.drawn).to eq(2)
      expect(delta_row.lost).to eq(0)
      expect(delta_row.points).to eq(2)
    end

    it "breaks a points tie by goal difference" do
      expect(rows[2].team_id).to eq(charlie.id) # 1 pt, GD -1
      expect(rows[3].team_id).to eq(bravo.id)   # 1 pt, GD -2
    end
  end

  describe "#third_place" do
    it "returns the third-ranked team" do
      finished(alpha, bravo, 2, 0)
      finished(charlie, delta, 1, 1)
      finished(alpha, charlie, 1, 0)
      finished(bravo, delta, 0, 0)
      expect(described_class.find("A").third_place.team_id).to eq(charlie.id)
    end
  end

  describe "seeding" do
    it "lists every team in the group, even ones that have not played" do
      finished(alpha, bravo, 1, 0)
      upcoming(charlie, delta)

      rows = described_class.find("A").rows
      expect(rows.map(&:team_id)).to match_array([ alpha, bravo, charlie, delta ].map(&:id))
      bench = rows.find { |row| row.team_id == charlie.id }
      expect(bench.played).to eq(0)
      expect(bench.points).to eq(0)
    end
  end

  describe ".find" do
    it "raises when no match belongs to the group" do
      expect { described_class.find("Z") }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
