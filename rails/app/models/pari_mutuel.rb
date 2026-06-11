# Pari-mutuel payout (pure, no writes): each loser forfeits exactly their stake
# into the pool; the winners split that pool in proportion to their stake. The
# batch is zero-sum, so total winnings can never exceed the pool — the house
# never subsidises (it only keeps the remainder when nobody backed the winner).
# d_used is the implied pool decimal for the bettor's own pick (total pool ÷
# that pick's stake). Float math throughout, matching the legacy semantics.
module PariMutuel
  Delta = Struct.new(:user_id, :pick, :stake, :d_used, :won, :delta, keyword_init: true)

  # `votes` is any enumerable of objects responding to user_id / pick / stake
  # (Vote records work directly). `result` is the winning pick string.
  def self.deltas(votes, result)
    total = votes.sum(&:stake)
    win_stake = votes.select { |v| v.pick == result }.sum(&:stake)
    lose_stake = total - win_stake

    stake_by_pick = Hash.new(0.0)
    votes.each { |v| stake_by_pick[v.pick] += v.stake }

    votes.map do |vote|
      won = vote.pick == result
      delta =
        if won
          win_stake.positive? ? (vote.stake / win_stake) * lose_stake : 0.0
        else
          -vote.stake
        end
      own_stake = stake_by_pick[vote.pick]
      d_used = own_stake.positive? ? total / own_stake : 1.0

      Delta.new(
        user_id: vote.user_id, pick: vote.pick, stake: vote.stake,
        d_used: d_used, won: won, delta: delta
      )
    end
  end
end
