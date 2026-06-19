require "rails_helper"

RSpec.describe Standings::ThirdPlace do
  # A 3-team group whose third-placed team finishes on 0 points with a goal
  # difference of -(1 + losing_margin); a larger margin makes a worse third place.
  def group_with_third(letter, losing_margin:)
    first = create(:team, name: "#{letter}1")
    second = create(:team, name: "#{letter}2")
    third = create(:team, name: "#{letter}3")
    name = "Group #{letter}"
    finished(first, second, 1, 0, name)
    finished(first, third, 1, 0, name)
    finished(second, third, losing_margin, 0, name)
    third
  end

  def finished(home, away, home_score, away_score, group)
    result = { 1 => "home", 0 => "draw", -1 => "away" }[home_score <=> away_score]
    create(:match, stage: "group", group_name: group,
      home_team: home, away_team: away,
      home_score: home_score, away_score: away_score,
      result: result, result_at: Time.current, settled: true)
  end

  describe ".ranked" do
    it "is empty when no group has a third place yet" do
      expect(described_class.ranked).to eq([])
    end

    it "picks each group's third place and ranks them across groups" do
      thirds = %w[A B C].each_with_index.to_h { |letter, i| [ letter, group_with_third(letter, losing_margin: i + 1) ] }

      ranked = described_class.ranked
      expect(ranked.map(&:letter)).to eq(%w[A B C])
      expect(ranked.map(&:rank)).to eq([ 1, 2, 3 ])
      expect(ranked.map { |entry| entry.row.team_id }).to eq([ thirds["A"], thirds["B"], thirds["C"] ].map(&:id))
      expect(ranked).to all(have_attributes(qualified: true))
    end

    it "qualifies only the best eight and draws the line after the eighth" do
      ("A".."I").each_with_index { |letter, i| group_with_third(letter, losing_margin: i + 1) }

      ranked = described_class.ranked
      expect(ranked.size).to eq(9)
      expect(ranked.count(&:qualified)).to eq(described_class::QUALIFYING_SLOTS)
      expect(ranked[7]).to have_attributes(rank: 8, qualified: true)
      expect(ranked[8]).to have_attributes(rank: 9, qualified: false)
      expect(ranked[8].letter).to eq("I")
    end
  end
end
