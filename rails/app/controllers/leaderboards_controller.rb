class LeaderboardsController < ApplicationController
  def show
    full = User.leaderboard
    page = [ params[:page].to_i, 1 ].max
    @offset = (page - 1) * PER_PAGE
    @board = full[@offset, PER_PAGE] || []
    @next_page = (page + 1 if full.size > @offset + PER_PAGE)
    return unless params[:page]

    render partial: "leaderboards/page",
           locals: { board: @board, offset: @offset, next_page: @next_page }, layout: false
  end
end
