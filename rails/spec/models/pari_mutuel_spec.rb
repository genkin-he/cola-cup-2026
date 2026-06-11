require "rails_helper"

RSpec.describe PariMutuel do
  # Lightweight stand-in for a vote row — deltas only needs user_id/pick/stake.
  Bet = Struct.new(:user_id, :pick, :stake, keyword_init: true) unless defined?(Bet)

  def bet(user_id, pick, stake)
    Bet.new(user_id: user_id, pick: pick, stake: stake)
  end

  def delta_for(deltas, user_id)
    deltas.find { |d| d.user_id == user_id }
  end

  describe ".deltas" do
    it "is zero-sum when the winning side has backers" do
      votes = [ bet(1, "home", 1.0), bet(2, "home", 1.0), bet(3, "away", 1.0) ]

      deltas = described_class.deltas(votes, "home")

      expect(deltas.sum(&:delta)).to be_within(1e-9).of(0.0)
    end

    it "makes each loser forfeit exactly their stake" do
      votes = [ bet(1, "home", 2.0), bet(2, "away", 3.0) ]

      deltas = described_class.deltas(votes, "home")

      loser = delta_for(deltas, 2)
      expect(loser.won).to be(false)
      expect(loser.delta).to eq(-3.0)
    end

    it "splits the losing pool in proportion to each winner's stake" do
      # winners home: A=2, B=1 (pool from losers = 3) -> A gets 2, B gets 1
      votes = [ bet(1, "home", 2.0), bet(2, "home", 1.0), bet(3, "away", 3.0) ]

      deltas = described_class.deltas(votes, "home")

      expect(delta_for(deltas, 1).delta).to be_within(1e-9).of(2.0)
      expect(delta_for(deltas, 2).delta).to be_within(1e-9).of(1.0)
      expect(delta_for(deltas, 3).delta).to be_within(1e-9).of(-3.0)
      expect(deltas.sum(&:delta)).to be_within(1e-9).of(0.0)
    end

    it "leaves the pool unclaimed when no one backed the winner (house keeps it)" do
      votes = [ bet(1, "away", 1.0), bet(2, "draw", 2.0) ]

      deltas = described_class.deltas(votes, "home")

      expect(deltas.map(&:won)).to all(be(false))
      expect(delta_for(deltas, 1).delta).to eq(-1.0)
      expect(delta_for(deltas, 2).delta).to eq(-2.0)
      # Not zero-sum: the whole pool is forfeited, nobody wins it.
      expect(deltas.sum(&:delta)).to be_within(1e-9).of(-3.0)
    end

    it "pays a sole winner nothing (no losers to draw from)" do
      votes = [ bet(1, "home", 5.0) ]

      deltas = described_class.deltas(votes, "home")

      sole = delta_for(deltas, 1)
      expect(sole.won).to be(true)
      expect(sole.delta).to eq(0.0)
    end

    it "charges a sole loser their full stake" do
      votes = [ bet(1, "home", 5.0) ]

      deltas = described_class.deltas(votes, "away")

      expect(delta_for(deltas, 1).delta).to eq(-5.0)
    end

    it "reports d_used as the pool decimal for the bettor's own pick" do
      # total pool = 6, home stake = 3, away stake = 3 -> both d_used = 2
      votes = [ bet(1, "home", 2.0), bet(2, "home", 1.0), bet(3, "away", 3.0) ]

      deltas = described_class.deltas(votes, "home")

      expect(delta_for(deltas, 1).d_used).to be_within(1e-9).of(2.0)
      expect(delta_for(deltas, 2).d_used).to be_within(1e-9).of(2.0)
      expect(delta_for(deltas, 3).d_used).to be_within(1e-9).of(2.0)
    end

    it "returns an empty result for an empty pool" do
      expect(described_class.deltas([], "home")).to eq([])
    end
  end
end
