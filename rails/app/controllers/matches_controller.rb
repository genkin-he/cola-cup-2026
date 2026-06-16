class MatchesController < ApplicationController
  include MatchDetailData

  def index
    @matches = Match.chronological.includes(:home_team, :away_team).to_a
    @tallies = Vote.tallies_by_match
    @market_odds = latest_polymarket_by_match
    @voted_match_ids = voted_match_ids
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
    @user_vote = current_user&.votes&.find_by(match_id: @match.id)
    @polymarket_url = polymarket_url(@match)
    @next_match_id = current_user ? next_match_id(@match) : nil
    @outcomes = helpers.match_outcomes(@match, @market_odds, @vote_odds)
  end

  private

  # Latest polymarket snapshot per match (one row each), keyed by match_id.
  def latest_polymarket_by_match
    latest_ids = OddsSnapshot.where(source: "polymarket").group(:match_id).maximum(:id).values
    OddsSnapshot.where(id: latest_ids).index_by(&:match_id)
  end

  # Devise defines current_user on controllers (阶段4); anonymous => no votes.
  def voted_match_ids
    return Set.new unless current_user

    current_user.votes.pluck(:match_id).to_set
  end
end
