# Shared assembly for the match-detail fragments (next-match navigation +
# Polymarket link), used by MatchesController#show and the VotesController turbo
# responses. The odds-compare rows come from BroadcastsHelper#match_outcomes
# (`helpers.match_outcomes`), which the broadcast jobs share too — one source.
module MatchDetailData
  extend ActiveSupport::Concern

  POLYMARKET_EVENT_BASE = "https://polymarket.com/event/".freeze

  private

  def polymarket_url(match)
    slug = match.poly_market&.slug
    slug.present? ? "#{POLYMARKET_EVENT_BASE}#{slug}" : nil
  end

  def next_match_id(match)
    Match.chronological
      .where("kickoff_at > :k OR (kickoff_at = :k AND id > :id)", k: match.kickoff_at, id: match.id)
      .limit(1).pick(:id)
  end
end
