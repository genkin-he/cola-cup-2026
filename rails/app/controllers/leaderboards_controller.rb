class LeaderboardsController < ApplicationController
  def show
    @board = User.board_for(params[:board])
    full = User.leaderboard_for(@board)
    @rank_mean = (User.mean_hit_rate(full) if @board.metric == :hit_rate)
    page = [ params[:page].to_i, 1 ].max
    @offset = (page - 1) * PER_PAGE
    @entries = full[@offset, PER_PAGE] || []
    @next_page = (page + 1 if full.size > @offset + PER_PAGE)
    return unless params[:page]

    render partial: "leaderboards/page",
           locals: { entries: @entries, board: @board, offset: @offset, next_page: @next_page, mean: @rank_mean },
           layout: false
  end
end
