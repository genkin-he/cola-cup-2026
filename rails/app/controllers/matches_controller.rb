class MatchesController < ApplicationController
  include MatchDetailData
  include MatchListData

  def index
    assign_schedule_data(Match.chronological.includes(:home_team, :away_team).to_a)
  end

  def show
    @match = Match.includes(:home_team, :away_team).find(params[:id])
    @votes, @next_page, = paginate_relation(Vote.detailed_for(@match))
    if params[:page]
      return render partial: "matches/votes_page",
                    locals: { match: @match, votes: @votes, next_page: @next_page }, layout: false
    end

    @vote_count = Vote.active.where(match_id: @match.id).count
    odds = @match.display_odds
    @market_odds = odds[:locked] || odds[:polymarket]
    @tally = @match.vote_tally
    @vote_odds = VoteOdds.from_tally(@tally, allows_draw: @match.allows_draw?)
    @roster = Vote.roster_by_pick(@match)
    @user_vote = current_user&.votes&.find_by(match_id: @match.id)
    @polymarket_url = polymarket_url(@match)
    @next_match_id = current_user ? next_match_id(@match) : nil
    @outcomes = helpers.match_outcomes(@match, @market_odds, @vote_odds)
  end
end
