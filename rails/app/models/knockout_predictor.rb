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
    ranked = Standings::ThirdPlace.ranked(@tables)
    @third_rank = ranked.index_by { |entry| entry.row.team_id }
    @slot_assignment = assign_thirds_to_slots(ranked)
  end

  # A Prediction, or nil when nothing can be inferred from current standings
  # (a winner-of-match slot "W74", or a group with no teams yet).
  def predict(label)
    return nil if label.blank?

    if (match = POSITION_RE.match(label))
      row = @tables.dig(match[2], match[1].to_i - 1)
      row && Prediction.new(kind: :team, row: row)
    elsif THIRD_RE.match?(label)
      candidates = third_candidates(label)
      Prediction.new(kind: :candidates, candidates: candidates) if candidates.any?
    end
  end

  private

  # The candidates shown for this slot, in the slot's own fixed group order
  # (A→B→C…, as the label lists them) — a stable order that does not reshuffle as
  # results land. The third assigned to this slot by the live one-to-one
  # allocation (#assign_thirds_to_slots) is pulled to the front — it is the
  # predicted opponent, so the same third never LEADS more than one slot, though
  # it may still sit in another slot's pool. With no full allocation yet, the
  # best-ranked third leads.
  def third_candidates(label)
    candidates = label_groups(label).filter_map { |letter|
      row = @tables.dig(letter, 2)
      next unless row

      entry = @third_rank[row.team_id]
      Candidate.new(
        row: row, group_letter: letter,
        rank: entry&.rank, qualified: entry&.qualified || false
      )
    }

    lead = @slot_assignment[label] ||
      candidates.min_by { |candidate| candidate.rank || Float::INFINITY }&.group_letter
    if lead && (index = candidates.find_index { |candidate| candidate.group_letter == lead })
      candidates.unshift(candidates.delete_at(index))
    end
    candidates
  end

  # Mirror FIFA's Annex C principle: the eight qualifying third-placed teams fill
  # the eight third-place slots one-to-one, each from a group its slot allows (so
  # the same third never opposes more than one winner). We don't have the official
  # 495-row table, so we compute *a* valid assignment for the current qualifiers —
  # enough for a live prediction the real draw later overrides. Returns
  # {slot_label => group_letter}, or {} when no full assignment exists yet (fewer
  # than eight thirds decided, or no bijection); callers then fall back to plain
  # cross-group order.
  def assign_thirds_to_slots(ranked)
    qualifying = ranked.select(&:qualified).map(&:letter)
    return {} unless qualifying.size == Standings::ThirdPlace::QUALIFYING_SLOTS

    slots = third_slot_labels.map { |label| [ label, label_groups(label) & qualifying ] }
    return {} unless slots.size == qualifying.size

    match_slots(slots.sort_by { |(label, groups)| [ groups.size, label ] }) || {}
  end

  # The knockout slot labels that resolve to a best-third (e.g. "3E/H/I/J/K").
  def third_slot_labels
    Match.where(stage: "r32").pluck(:home_label, :away_label).flatten
      .compact.select { |label| THIRD_RE.match?(label) }.uniq
  end

  def label_groups(label)
    THIRD_RE.match(label)[1].split("/")
  end

  # Depth-first perfect matching of slots to groups (slots pre-sorted fewest
  # options first, so forced picks resolve early); deterministic, returns nil
  # when no bijection exists.
  def match_slots(slots, index = 0, used = {}, result = {})
    return result.dup if index == slots.size

    label, groups = slots[index]
    groups.each do |group|
      next if used[group]

      used[group] = true
      result[label] = group
      matched = match_slots(slots, index + 1, used, result)
      return matched if matched

      used.delete(group)
      result.delete(label)
    end
    nil
  end
end
