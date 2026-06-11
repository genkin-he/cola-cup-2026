module Broadcasts
  # Crowd vote / market odds / lock changes for one match: refresh the detail
  # page's odds bars (+ voter list when a vote changed) and the schedule card's
  # big block.
  class MatchOddsJob < ApplicationJob
    include Renderable
    queue_as :default

    def perform(match_id, include_votes = false)
      match = find_match(match_id)
      return unless match

      broadcast_odds_compare(match)
      broadcast_votes_list(match) if include_votes
      broadcast_card_big(match)
    end
  end
end
