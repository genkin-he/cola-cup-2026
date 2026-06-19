module MatchListData
  extend ActiveSupport::Concern

  private

  # Assigns the per-match display data the schedule card partials need
  # (matches/_match_card and friends): the vote tallies, latest market line, and
  # which matches the current viewer has voted on. Shared by the home schedule,
  # team pages and group pages.
  def assign_schedule_data(matches)
    @matches = matches
    @tallies = Vote.tallies_by_match
    @market_odds = latest_polymarket_by_match
    @voted_match_ids = voted_match_ids
  end

  # Latest polymarket snapshot per match (one row each), keyed by match_id.
  def latest_polymarket_by_match
    latest_ids = OddsSnapshot.where(source: "polymarket").group(:match_id).maximum(:id).values
    OddsSnapshot.where(id: latest_ids).index_by(&:match_id)
  end

  # Devise defines current_user on controllers; anonymous => no votes.
  def voted_match_ids
    return Set.new unless current_user

    current_user.votes.pluck(:match_id).to_set
  end
end
