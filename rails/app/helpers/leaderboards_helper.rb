module LeaderboardsHelper
  # The headline ranking score (0–100) for the accuracy boards — the exact value
  # leaderboard_for ranks by, so the displayed number always matches the order.
  # Returns nil for boards ranked by a directly displayed metric (战绩 / 兑换).
  # `mean` is the global hit rate, needed only by 神预榜's Bayesian score.
  def board_rank_score(board, entry, mean)
    case board.metric
    when :hit_rate
      User.bayesian_hit_score(entry.wins, entry.bets, mean.to_f) * 100
    when :miss_rate
      User.wilson_lower_bound(entry.bets - entry.wins, entry.bets) * 100
    end
  end
end
