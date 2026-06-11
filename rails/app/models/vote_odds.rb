# Pari-mutuel pool odds from the crowd's stakes. An outcome's implied
# probability is its share of all bottles wagered; its decimal odds are the
# whole pool divided by that outcome's stake — i.e. what each backing bottle
# returns if it wins. An outcome with no stake has no defined odds (nil).
#
# Mirrors settlement exactly: losers forfeit their stake into the pool and
# winners split it in proportion to stake, so payouts can never exceed the pool.
class VoteOdds
  MIN_SAMPLE = 3
  # Min gap (percentage points) between market and crowd before surfacing a lead.
  LEAD_DIVERGENCE_PCT = 33

  attr_reader :p_home, :p_draw, :p_away, :d_home, :d_draw, :d_away, :total, :low_sample

  # `tally` responds to home / draw / away (stake sums), stake_total and voters.
  # Returns nil when nothing has been wagered (no defined odds).
  def self.from_tally(tally, allows_draw:)
    return nil if tally.stake_total.zero?

    new(tally, allows_draw)
  end

  def initialize(tally, allows_draw)
    @p_home = share(tally.home, tally.stake_total)
    @p_draw = allows_draw ? share(tally.draw, tally.stake_total) : nil
    @p_away = share(tally.away, tally.stake_total)
    @d_home = decimal(tally.home, tally.stake_total)
    @d_draw = allows_draw ? decimal(tally.draw, tally.stake_total) : nil
    @d_away = decimal(tally.away, tally.stake_total)
    @total = tally.voters
    @low_sample = tally.voters < MIN_SAMPLE
  end

  def low_sample?
    @low_sample
  end

  private

  def share(stake, stake_total)
    stake / stake_total
  end

  def decimal(stake, stake_total)
    stake.positive? ? stake_total / stake : nil
  end
end
