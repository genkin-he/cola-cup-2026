require "rails_helper"

RSpec.describe KnockoutPredictor do
  def finished(home, away, home_score, away_score, group)
    result = { 1 => "home", 0 => "draw", -1 => "away" }[home_score <=> away_score]
    create(:match, stage: "group", group_name: group,
      home_team: home, away_team: away,
      home_score: home_score, away_score: away_score,
      result: result, result_at: Time.current, settled: true)
  end

  # A 3-team group ranked first > second > third; `third_concedes` widens the
  # third-placed team's goals-against so its cross-group rank can be controlled.
  def group_with(letter, third_concedes: 1)
    first = create(:team, name: "#{letter}-1st")
    second = create(:team, name: "#{letter}-2nd")
    third = create(:team, name: "#{letter}-3rd")
    name = "Group #{letter}"
    finished(first, second, 1, 0, name)
    finished(first, third, 1, 0, name)
    finished(second, third, third_concedes, 0, name)
    { first: first, second: second, third: third }
  end

  describe "#predict" do
    it "resolves a group-winner slot to the current first place" do
      teams = group_with("A")
      prediction = described_class.new.predict("1A")
      expect(prediction.kind).to eq(:team)
      expect(prediction.row.team_id).to eq(teams[:first].id)
    end

    it "resolves a runner-up slot to the current second place" do
      teams = group_with("A")
      prediction = described_class.new.predict("2A")
      expect(prediction.kind).to eq(:team)
      expect(prediction.row.team_id).to eq(teams[:second].id)
    end

    it "lists third-place candidates ordered by current cross-group ranking" do
      # B's third concedes least → best third → ranked above A's and C's.
      a = group_with("A", third_concedes: 3)
      b = group_with("B", third_concedes: 1)
      c = group_with("C", third_concedes: 2)

      prediction = described_class.new.predict("3A/B/C")
      expect(prediction.kind).to eq(:candidates)
      expect(prediction.candidates.map(&:group_letter)).to eq(%w[B C A])
      expect(prediction.candidates.map { |candidate| candidate.row.team_id }).to eq([ b[:third], c[:third], a[:third] ].map(&:id))
      expect(prediction.candidates.first).to have_attributes(rank: 1, qualified: true)
    end

    it "returns nil for a winner-of-match slot" do
      group_with("A")
      expect(described_class.new.predict("W74")).to be_nil
    end

    it "returns nil for a blank label" do
      expect(described_class.new.predict(nil)).to be_nil
      expect(described_class.new.predict("")).to be_nil
    end
  end
end
