module Broadcasts
  # A user was soft-deleted or restored: their stakes (dis)appear from the crowd
  # odds, voter lists and schedule cards of every match they voted, and from the
  # leaderboard.
  class UserVisibilityJob < ApplicationJob
    include Renderable
    queue_as :default

    def perform(user_id)
      user = User.find_by(id: user_id)
      return unless user

      Match.joins(:votes).where(votes: { user_id: user.id })
        .distinct.includes(:home_team, :away_team)
        .find_each do |match|
          broadcast_odds_compare(match)
          broadcast_votes_list(match)
          broadcast_card_big(match)
        end

      broadcast_leaderboard
    end
  end
end
