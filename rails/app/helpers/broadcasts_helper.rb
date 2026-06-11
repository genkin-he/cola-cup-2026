module BroadcastsHelper
  # Per-outcome view rows for the odds-compare bars, combining the market line
  # with the crowd odds. Shared by matches#show, votes turbo_stream responses and
  # the broadcast jobs so the fragment renders identically everywhere.
  def match_outcomes(match, market_odds, vote_odds)
    match.valid_picks.map do |key|
      {
        key: key,
        team_label: pick_team_label(match, key),
        market_p: market_odds&.public_send("p_#{key}"),
        market_d: market_odds&.public_send("d_#{key}"),
        crowd_p: vote_odds&.public_send("p_#{key}"),
        crowd_d: vote_odds&.public_send("d_#{key}")
      }
    end
  end
end
