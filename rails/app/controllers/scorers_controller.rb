class ScorersController < ApplicationController
  def index
    full = Scorers.ranked
    page = [ params[:page].to_i, 1 ].max
    @offset = (page - 1) * PER_PAGE
    @rows = full[@offset, PER_PAGE] || []
    @next_page = (page + 1 if full.size > @offset + PER_PAGE)
    return unless params[:page]

    render partial: "scorers/page",
           locals: { rows: @rows, offset: @offset, next_page: @next_page },
           layout: false
  end
end
