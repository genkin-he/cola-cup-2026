require "rails_helper"

RSpec.describe Scorers do
  def score(player, team, match, penalty: false, own_goal: false, minute: 10)
    Goal.create!(match: match, team: team, player_name: player,
      minute: minute, penalty: penalty, own_goal: own_goal)
  end

  describe ".ranked" do
    it "is empty when no goals have been recorded" do
      expect(described_class.ranked).to eq([])
    end

    it "ranks by goals, drops own goals, counts penalties, and carries team identity" do
      france = create(:team, name: "France", name_zh: "法国", flag: "🇫🇷")
      brazil = create(:team, name: "Brazil", name_zh: "巴西", flag: "🇧🇷")
      match = create(:match)

      3.times { score("Mbappé", france, match) }
      score("Mbappé", france, match, penalty: true)
      2.times { score("Neymar", brazil, match) }
      score("Defender", brazil, match, own_goal: true)

      ranked = described_class.ranked

      expect(ranked.map(&:player_name)).to eq(%w[Mbappé Neymar])
      expect(ranked).not_to include(have_attributes(player_name: "Defender"))
      expect(ranked.first)
        .to have_attributes(goals: 4, penalties: 1, team_id: france.id,
          name_zh: "法国", flag: "🇫🇷", display_name: "法国")
    end

    it "keeps same-named players on different teams distinct" do
      a = create(:team, name: "A")
      b = create(:team, name: "B")
      match = create(:match)

      2.times { score("Sam", a, match) }
      score("Sam", b, match)

      ranked = described_class.ranked
      expect(ranked.map { |row| [ row.player_name, row.team_id, row.goals ] })
        .to eq([ [ "Sam", a.id, 2 ], [ "Sam", b.id, 1 ] ])
    end

    it "breaks goal ties by fewer penalties, then by name" do
      team = create(:team)
      match = create(:match)

      2.times { score("Ana", team, match) }       # 2 open-play goals
      score("Bob", team, match)                    # 2 goals, one a penalty
      score("Bob", team, match, penalty: true)

      expect(described_class.ranked.map(&:player_name)).to eq(%w[Ana Bob])
    end
  end
end
