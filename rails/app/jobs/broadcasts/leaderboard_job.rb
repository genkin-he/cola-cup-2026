module Broadcasts
  # Standalone leaderboard refresh — used after a redemption (the redeemer's own
  # page updates from the form response; everyone else sees the 已兑 column move).
  class LeaderboardJob < ApplicationJob
    include Renderable
    queue_as :default

    def perform
      broadcast_leaderboard
    end
  end
end
