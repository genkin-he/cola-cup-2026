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

    it "leads with the predicted opponent, then lists the rest in fixed label order" do
      # B's third concedes least → best third. With no full allocation yet, the
      # best-ranked third leads; the others keep the slot's fixed group order
      # (A→B→C), not a ranking order.
      a = group_with("A", third_concedes: 3)
      b = group_with("B", third_concedes: 1)
      c = group_with("C", third_concedes: 2)

      prediction = described_class.new.predict("3A/B/C")
      expect(prediction.kind).to eq(:candidates)
      expect(prediction.candidates.map(&:group_letter)).to eq(%w[B A C])
      expect(prediction.candidates.map { |candidate| candidate.row.team_id }).to eq([ b[:third], a[:third], c[:third] ].map(&:id))
      expect(prediction.candidates.first).to have_attributes(rank: 1, qualified: true)
    end

    it "leads each third-place slot with its official Annex C opponent" do
      # All twelve groups present, with a clean 1..12 cross-group third ordering
      # (more conceded -> worse goal difference -> lower rank), so the top eight
      # (A–H) qualify. For the qualifying set ABCDEFGH the official Annex C row is
      # "CFHEBAGD" over matches 74/77/79/80/81/82/85/87.
      letters = %w[A B C D E F G H I J K L]
      letters.each_with_index { |letter, i| group_with(letter, third_concedes: i + 1) }
      match_order = [ 74, 77, 79, 80, 81, 82, 85, 87 ]
      slot_labels = %w[3A/B/C/D/F 3C/D/F/G/H 3C/E/F/H/I 3E/H/I/J/K 3B/E/F/I/J 3A/E/H/I/J 3E/F/G/I/J 3D/E/I/J/L]
      slot_labels.each_with_index do |label, i|
        create(:match, stage: "r32", group_name: nil, home_team: nil, away_team: nil,
          external_key: "m:#{match_order[i]}", home_label: "1#{letters[i]}", away_label: label)
      end

      predictor = described_class.new
      leads = slot_labels.map { |label| predictor.predict(label).candidates.first.group_letter }

      expect(leads).to eq(%w[C F H E B A G D]) # official Annex C allocation for ABCDEFGH
      leads.each_with_index do |group, i|
        expect(slot_labels[i][1..].split("/")).to include(group) # from the slot's allowed pool
      end
    end

    it "returns nil for a winner-of-match slot when no bracket is loaded" do
      group_with("A")
      expect(described_class.new.predict("W74")).to be_nil
    end

    it "predicts a winner slot inside the window as its set of possible teams" do
      a = group_with("A")
      b = group_with("B")
      # R32 (unresolved) is the frontier, so the window is r32/r16/qf.
      create(:match, stage: "r32", group_name: nil, home_team: nil, away_team: nil,
        external_key: "m:73", home_label: "1A", away_label: "2B")
      create(:match, stage: "r32", group_name: nil, home_team: nil, away_team: nil,
        external_key: "m:74", home_label: "1B", away_label: "2A")
      create(:match, stage: "r16", group_name: nil, home_team: nil, away_team: nil,
        external_key: "m:89", home_label: "W73", away_label: "W74")

      prediction = described_class.new.predict("W73")
      expect(prediction.kind).to eq(:multi)
      expect(prediction.candidates.map { |candidate| candidate.row.team_id })
        .to contain_exactly(a[:first].id, b[:second].id)
    end

    it "does not predict a round beyond the window" do
      group_with("A")
      group_with("B")
      create(:match, stage: "r32", group_name: nil, home_team: nil, away_team: nil,
        external_key: "m:73", home_label: "1A", away_label: "2B")
      create(:match, stage: "sf", group_name: nil, home_team: nil, away_team: nil,
        external_key: "m:101", home_label: "W97", away_label: "W98")

      expect(described_class.new.predict("W97")).to be_nil
    end

    it "returns nil for a blank label" do
      expect(described_class.new.predict(nil)).to be_nil
      expect(described_class.new.predict("")).to be_nil
    end
  end
end
