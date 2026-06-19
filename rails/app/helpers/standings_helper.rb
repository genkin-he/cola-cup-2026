module StandingsHelper
  # Goal difference with an explicit sign: "+3" / "0" / "-2".
  def format_goal_diff(diff)
    diff > 0 ? "+#{diff}" : diff.to_s
  end
end
