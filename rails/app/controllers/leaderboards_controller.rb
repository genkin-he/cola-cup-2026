class LeaderboardsController < ApplicationController
  def show
    @board = User.leaderboard
  end
end
