class Vote < ApplicationRecord
  # Stake sums per outcome (bottles, drives stake-weighted odds) plus the
  # distinct-voter count (people, for "N 人" display and small-sample warnings).
  Tally = Struct.new(:home, :draw, :away, :stake_total, :voters, keyword_init: true)

  belongs_to :match
  belongs_to :user

  validates :pick, presence: true, inclusion: { in: Match::PICKS }
  validates :stake, presence: true
  validates :user_id, uniqueness: { scope: :match_id }

  # Soft-deleted users are excluded everywhere their votes would be visible or
  # counted: tallies (odds), the per-match roster, and — via detailed_for —
  # settlement itself.
  scope :active, -> { joins(:user).where(users: { deleted_at: nil }) }

  # A vote change moves the crowd odds and the voter list (create/update/destroy).
  after_commit :broadcast_match_change

  def broadcast_match_change
    Broadcasts::MatchOddsJob.perform_later(match_id, true)
  end

  def self.empty_tally
    Tally.new(home: 0.0, draw: 0.0, away: 0.0, stake_total: 0.0, voters: 0)
  end

  # Stake/voter tally for one match (active voters only).
  def self.tally_for(match)
    tally = empty_tally
    grouped = active.where(match_id: match.id)
      .group(:pick)
      .pluck(:pick, Arel.sql("COUNT(*)"), Arel.sql("COALESCE(SUM(stake), 0)"))
    grouped.each do |pick, count, stake_sum|
      tally[pick] = stake_sum.to_f
      tally.stake_total += stake_sum.to_f
      tally.voters += count
    end
    tally
  end

  # All matches' tallies in one query, keyed by match_id — for the schedule page.
  def self.tallies_by_match
    rows = active
      .group(:match_id, :pick)
      .pluck(:match_id, :pick, Arel.sql("COUNT(*)"), Arel.sql("COALESCE(SUM(stake), 0)"))
    rows.each_with_object({}) do |(match_id, pick, count, stake_sum), map|
      tally = map[match_id] ||= empty_tally
      tally[pick] = stake_sum.to_f
      tally.stake_total += stake_sum.to_f
      tally.voters += count
    end
  end

  # Per-match roster, oldest edit first, with each voter's profile preloaded
  # (active voters only). Drives the votes list and the settlement roster.
  def self.detailed_for(match)
    active.where(match_id: match.id).includes(:user).order(:updated_at)
  end
end
