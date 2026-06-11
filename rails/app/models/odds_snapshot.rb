class OddsSnapshot < ApplicationRecord
  SOURCES = %w[polymarket manual vote].freeze
  MARKET_SOURCES = %w[polymarket manual].freeze

  belongs_to :match

  validates :source, presence: true
  validates :taken_at, presence: true

  # New odds (polymarket fetch, manual entry, or lock) refresh the match's odds
  # bars and schedule card — covers FetchOddsJob, admin manual odds, and locking.
  after_commit :broadcast_odds, on: :create

  def broadcast_odds
    Broadcasts::MatchOddsJob.perform_later(match_id, false)
  end
end
