# Turns a knockout placeholder label ("2A", "1E", "3A/B/C/D/F") into the team(s)
# it would currently resolve to, based on live group standings. This is a
# DISPLAY-ONLY soft link: the real matchup still arrives via the schedule sync
# (which sets home_team_id/away_team_id); a prediction is only shown while a slot
# is unresolved. Build once per render and reuse — it reads the cached group
# tables, so repeated predicts across a page are cheap.
class KnockoutPredictor
  POSITION_RE = /\A([12])([A-L])\z/                 # 1A / 2B → group winner / runner-up
  THIRD_RE = %r{\A3([A-L](?:/[A-L])*)\z}            # 3A/B/C/D/F → best-third candidates

  Prediction = Struct.new(:kind, :row, :candidates, keyword_init: true)
  Candidate = Struct.new(:row, :group_letter, :rank, :qualified, keyword_init: true)

  def initialize
    @tables = Standings::Group.tables
    @third_rank = Standings::ThirdPlace.ranked(@tables).index_by { |entry| entry.row.team_id }
  end

  # A Prediction, or nil when nothing can be inferred from current standings
  # (a winner-of-match slot "W74", or a group with no teams yet).
  def predict(label)
    return nil if label.blank?

    if (match = POSITION_RE.match(label))
      row = @tables.dig(match[2], match[1].to_i - 1)
      row && Prediction.new(kind: :team, row: row)
    elsif (match = THIRD_RE.match(label))
      candidates = third_candidates(match[1].split("/"))
      Prediction.new(kind: :candidates, candidates: candidates) if candidates.any?
    end
  end

  private

  # Each listed group's current third-placed team, ordered by their live
  # cross-group third-place ranking (best first) — the order they're displayed in.
  def third_candidates(letters)
    letters.filter_map { |letter|
      row = @tables.dig(letter, 2)
      next unless row

      entry = @third_rank[row.team_id]
      Candidate.new(
        row: row, group_letter: letter,
        rank: entry&.rank, qualified: entry&.qualified || false
      )
    }.sort_by { |candidate| candidate.rank || Float::INFINITY }
  end
end
