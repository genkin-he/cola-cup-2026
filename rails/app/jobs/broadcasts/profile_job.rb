module Broadcasts
  # A user edited their nickname/emoji: refresh the leaderboard and the voter
  # lists of every unsettled match they have a stake in.
  class ProfileJob < ApplicationJob
    include Renderable
    queue_as :default

    def perform(user_id)
      user = User.find_by(id: user_id)
      return unless user

      broadcast_leaderboard

      Match.joins(:votes).where(votes: { user_id: user.id }, settled: false)
        .distinct.includes(:home_team, :away_team)
        .find_each { |match| broadcast_votes_list(match) }
    end
  end
end
