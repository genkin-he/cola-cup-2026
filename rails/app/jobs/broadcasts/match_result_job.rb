module Broadcasts
  # A score / result was recorded (not settled): update the schedule card's
  # teams (score) and big (result) blocks, morph the detail page, and refresh
  # the admin to-settle list.
  class MatchResultJob < ApplicationJob
    include Renderable
    queue_as :default

    def perform(match_id)
      match = find_match(match_id)
      return unless match

      broadcast_card_teams(match)
      broadcast_card_big(match)
      Turbo::StreamsChannel.broadcast_refresh_to("match", match)
      Turbo::StreamsChannel.broadcast_refresh_to("admin")
    end
  end
end
