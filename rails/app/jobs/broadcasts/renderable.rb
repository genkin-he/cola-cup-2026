module Broadcasts
  # Shared broadcast fragments. The partials are the same files the pages render
  # initially; locals are explicit and never reference current_user (per-viewer
  # state is handled by the viewer's own response or by client-side Stimulus).
  module Renderable
    POLYMARKET_EVENT_BASE = "https://polymarket.com/event/".freeze

    private

    def find_match(match_id)
      Match.includes(:home_team, :away_team).find_by(id: match_id)
    end

    def broadcast_odds_compare(match)
      tally = match.vote_tally
      vote_odds = VoteOdds.from_tally(tally, allows_draw: match.allows_draw?)
      market = market_snapshot(match)
      Turbo::StreamsChannel.broadcast_replace_to(
        "match", match,
        target: "odds_compare_#{match.id}",
        partial: "matches/odds_compare",
        locals: {
          match: match,
          outcomes: ApplicationController.helpers.match_outcomes(match, market, vote_odds),
          crowd_total: tally.voters,
          low_sample: vote_odds&.low_sample?,
          polymarket_url: polymarket_url(match)
        }
      )
    end

    def broadcast_votes_list(match)
      Turbo::StreamsChannel.broadcast_replace_to(
        "match", match,
        target: "votes_list_#{match.id}",
        partial: "matches/votes_list",
        locals: { match: match, votes: Vote.detailed_for(match) }
      )
    end

    def broadcast_card_big(match)
      Turbo::StreamsChannel.broadcast_replace_to(
        "schedule",
        target: "match_card_big_#{match.id}",
        partial: "matches/card_big",
        locals: { match: match, tally: match.vote_tally, market: market_snapshot(match) }
      )
    end

    def broadcast_card_teams(match)
      Turbo::StreamsChannel.broadcast_replace_to(
        "schedule",
        target: "match_card_teams_#{match.id}",
        partial: "matches/card_teams",
        locals: { match: match }
      )
    end

    def broadcast_card_meta(match)
      Turbo::StreamsChannel.broadcast_replace_to(
        "schedule",
        target: "match_card_meta_#{match.id}",
        partial: "matches/card_meta",
        locals: { match: match, voted: false }
      )
    end

    def broadcast_leaderboard
      Turbo::StreamsChannel.broadcast_replace_to(
        "leaderboard",
        target: "leaderboard_rows",
        partial: "leaderboards/board",
        locals: { board: User.leaderboard }
      )
    end

    def market_snapshot(match)
      odds = match.display_odds
      odds[:locked] || odds[:polymarket]
    end

    def polymarket_url(match)
      slug = match.poly_market&.slug
      slug.present? ? "#{POLYMARKET_EVENT_BASE}#{slug}" : nil
    end
  end
end
