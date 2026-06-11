require "rails_helper"

RSpec.describe VoteOdds do
  def tally(home:, draw:, away:, voters:)
    Vote::Tally.new(
      home: home, draw: draw, away: away,
      stake_total: home + draw + away, voters: voters
    )
  end

  describe ".from_tally" do
    it "is nil when nothing has been wagered" do
      expect(described_class.from_tally(tally(home: 0, draw: 0, away: 0, voters: 0), allows_draw: true)).to be_nil
    end

    it "computes stake shares and pool decimals for a two-way (knockout) market" do
      odds = described_class.from_tally(tally(home: 3.0, draw: 0.0, away: 1.0, voters: 4), allows_draw: false)

      expect(odds.p_home).to be_within(1e-9).of(0.75)
      expect(odds.p_away).to be_within(1e-9).of(0.25)
      expect(odds.p_draw).to be_nil
      expect(odds.d_home).to be_within(1e-9).of(4.0 / 3.0)
      expect(odds.d_away).to be_within(1e-9).of(4.0)
      expect(odds.d_draw).to be_nil
    end

    it "includes the draw outcome when the stage allows it" do
      odds = described_class.from_tally(tally(home: 2.0, draw: 1.0, away: 1.0, voters: 4), allows_draw: true)

      expect(odds.p_draw).to be_within(1e-9).of(0.25)
      expect(odds.d_draw).to be_within(1e-9).of(4.0)
    end

    it "gives an outcome with no stake nil decimal odds" do
      odds = described_class.from_tally(tally(home: 4.0, draw: 0.0, away: 0.0, voters: 4), allows_draw: true)

      expect(odds.p_away).to eq(0.0)
      expect(odds.d_away).to be_nil
    end

    it "flags a low sample below MIN_SAMPLE voters" do
      expect(described_class.from_tally(tally(home: 1.0, draw: 0, away: 1.0, voters: 2), allows_draw: false).low_sample?).to be(true)
      expect(described_class.from_tally(tally(home: 1.0, draw: 1.0, away: 1.0, voters: 3), allows_draw: true).low_sample?).to be(false)
    end
  end
end
