module MatchesHelper
  # status (Match#status symbol) => [css modifier, label]. Ported from
  # matchState.ts STATUS_META + StatusBadge.BADGE_CLASS (upcoming reuses the
  # "scheduled" badge styling).
  STATUS_BADGE = {
    scheduled: [ "scheduled", "未开放" ],
    upcoming:  [ "scheduled", "待开盘" ],
    open:      [ "open", "可预测" ],
    live:      [ "live", "比赛中" ],
    locked:    [ "locked", "已截止" ],
    settled:   [ "settled", "已结算" ]
  }.freeze

  PICK_SHORT = { "home" => "主", "draw" => "平", "away" => "客" }.freeze
  RESULT_LABEL = { "home" => "主胜", "draw" => "平局", "away" => "客胜" }.freeze
  DIVERGENCE_TIP = "市场（聪明钱）与同事看法分歧大 —— 用同事赔率下注可能赢更多可乐".freeze
  GROUP_RE = /Group ([A-L])/.freeze

  # Pick-button label sizing. A button is one of three equal columns, so on the
  # narrowest phone layout its inner text is ~78px wide; a CJK glyph is roughly
  # 1em, giving this per-button width budget. Long country names (沙特阿拉伯,
  # 乌兹别克斯坦) shrink to stay on one line instead of wrapping and stretching
  # the whole button row taller.
  PICK_LABEL_MAX_FONT_PX = 20
  PICK_LABEL_MIN_FONT_PX = 11
  PICK_LABEL_FIT_WIDTH_PX = 78

  def status_badge(status, extra_class: nil)
    css, label = STATUS_BADGE.fetch(status)
    tag.span(label, class: [ "badge", css, extra_class ].compact.join(" "))
  end

  # 焦点大战: top Polymarket-volume unsettled matches. Memoized per render so a
  # full schedule page costs one query; broadcast re-renders work the same way.
  def focus_match?(match)
    @_focus_match_ids ||= PolyMarket.focus_match_ids
    @_focus_match_ids.include?(match.id)
  end

  def match_group_letter(match)
    match.group_name&.match(GROUP_RE)&.captures&.first
  end

  def team_display_name(team, label)
    team&.display_name.presence || label.presence || ""
  end

  def team_flag(team)
    team&.flag.presence || "🏳️"
  end

  # Detail-page team cell (flag + name). A resolved team links to its fixtures
  # page; an unresolved knockout slot shows a soft-link prediction (single team,
  # or the full third-place candidate list) marked "预测", else a readable label.
  def detail_team_cell(team, label)
    return link_to(team_flag_name(team), team_path(team), class: "team") if team

    case (prediction = slot_prediction(team, label))&.kind
    when :team
      link_to(safe_join([ row_flag_name(prediction.row), predicted_tag ]),
              team_path(prediction.row.team_id), class: "team predicted")
    when :candidates
      tag.span(detail_candidates(prediction.candidates), class: "team predicted is-candidates")
    else
      tag.span(tag.span(humanize_slot_label(label), class: "nm placeholder"), class: "team")
    end
  end

  # Schedule-card team cell inner (compact). Resolved team → flag + name; an
  # unresolved knockout slot → predicted team / a row of candidate flags / a
  # readable label fallback. Used by matches/_card_teams (broadcast-safe: only
  # needs `match`, computes the predictor on its own).
  def card_team_html(team, label)
    return team_flag_name(team) if team

    case (prediction = slot_prediction(team, label))&.kind
    when :team
      safe_join([ row_flag_name(prediction.row), predicted_tag ])
    when :candidates
      safe_join([
        tag.span(safe_join(prediction.candidates.map { |c| tag.span(row_flag(c.row), class: "flag") }), class: "cand-flags"),
        predicted_tag
      ])
    else
      tag.span(humanize_slot_label(label), class: "nm placeholder")
    end
  end

  # The third-place candidate list for a knockout card's expandable disclosure,
  # or nil when neither side is an unresolved third-place slot.
  def card_candidate_prediction(match)
    [ [ match.home_team, match.home_label ], [ match.away_team, match.away_label ] ]
      .filter_map { |team, label| slot_prediction(team, label) }
      .find { |prediction| prediction.kind == :candidates }&.candidates
  end

  # Per-render predictor; reused across every card on a page (like focus_match?).
  def knockout_predictor
    @_knockout_predictor ||= KnockoutPredictor.new
  end

  # Prediction for an unresolved slot, or nil (resolved team, blank label, or
  # nothing inferable like a winner-of-match slot).
  def slot_prediction(team, label)
    return nil if team || label.blank?

    knockout_predictor.predict(label)
  end

  # Readable fallback for a slot we can't predict yet: "A 组第2" / "A/B/C/D/F 组第3"
  # / "M74 胜者" / the raw label.
  def humanize_slot_label(label)
    return "" if label.blank?

    if (match = /\A([12])([A-L])\z/.match(label))
      "#{match[2]} 组第#{match[1]}"
    elsif label.start_with?("3") && label[1..].match?(%r{\A[A-L](/[A-L])*\z})
      "#{label[1..]} 组第3"
    elsif (match = /\AW(\d+)\z/.match(label))
      "M#{match[1]} 胜者"
    else
      label
    end
  end

  def predicted_tag
    tag.span("预测", class: "pred-tag")
  end

  def team_flag_name(team)
    safe_join([
      tag.span(team_flag(team), class: "flag"),
      tag.span(team.display_name, class: "nm")
    ])
  end

  # Same, from a denormalized Standings::Row (knockout predictions).
  def row_flag(row)
    row.flag.presence || "🏳️"
  end

  def row_flag_name(row)
    safe_join([
      tag.span(row_flag(row), class: "flag"),
      tag.span(row.display_name, class: "nm")
    ])
  end

  # Vertical candidate list for the match-detail page: each third-place candidate
  # (flag + name + group) ordered best-first, with a dashed qualification line —
  # the same convention as the third-place ranking page — and a link to it.
  def detail_candidates(candidates)
    cut_drawn = false
    rows = candidates.flat_map do |candidate|
      items = []
      if !candidate.qualified && !cut_drawn
        cut_drawn = true
        items << tag.div(tag.span("出线分界线"), class: "st-cutline cand-cut")
      end
      items << tag.div(class: [ "cand-row", candidate.qualified ? "in" : "out" ].join(" ")) do
        safe_join([
          tag.span(row_flag(candidate.row), class: "flag"),
          tag.span(candidate.row.display_name, class: "nm"),
          tag.span("#{candidate.group_letter} 组③", class: "g")
        ])
      end
      items
    end

    tag.span("第三名候选", class: "nm cand-hint") +
      tag.div(safe_join(rows), class: "cand-list detail-cand-list") +
      link_to("查看完整第三名排行 →", third_place_path, class: "cand-more")
  end

  # The "VS" / score middle token on a schedule card (shows the score as soon as
  # it is recorded).
  def match_score_token(match)
    if match.home_score && match.away_score
      "#{match.home_score}–#{match.away_score}"
    else
      "VS"
    end
  end

  # Detail-page middle token — shows the live score while in play and the final
  # score once settled; hides it in between so a pre-settlement correction
  # isn't presented as final.
  def detail_score_token(match)
    if (match.settled? || match.live?) && match.home_score && match.away_score
      "#{match.home_score}–#{match.away_score}"
    else
      "VS"
    end
  end

  # Font size (px) for a pick-button label, shrinking long names to one line.
  def pick_label_font_px(label)
    length = label.to_s.length
    return PICK_LABEL_MAX_FONT_PX if length <= 4

    (PICK_LABEL_FIT_WIDTH_PX / length).clamp(PICK_LABEL_MIN_FONT_PX, PICK_LABEL_MAX_FONT_PX)
  end

  # Decimal pool odds for each valid pick AS IF the current viewer's fixed stake
  # already sat on that pick — their existing vote (if any) is moved onto the
  # pick before the pool is divided. Raw crowd odds ignore the viewer's own
  # stake, so a side nobody has backed yet (e.g. 平 when only 葡萄牙 has votes)
  # shows no payout, when picking it would in fact win the existing pool. Returns
  # pick => decimal (>= 1.0); exactly 1.0 means there's no opposing pool to win.
  def preview_odds_by_pick(match, tally, current_pick)
    stake = match.stake
    viewer_in_pool = current_pick ? stake : 0.0
    others_total = tally.stake_total - viewer_in_pool

    match.valid_picks.index_with do |pick|
      others_on_pick = tally.public_send(pick) - (current_pick == pick ? stake : 0.0)
      (others_total + stake) / (others_on_pick + stake)
    end
  end

  # Outcome label for a pick: the team's display name, or 平局 for a draw.
  def pick_team_label(match, key)
    case key
    when "home" then team_display_name(match.home_team, match.home_label)
    when "away" then team_display_name(match.away_team, match.away_label)
    else "平局"
    end
  end

  # Describes the giant right-hand block on a schedule card. Mirrors
  # ScheduleTimeline.MatchBig: result > market leader (+divergence) > crowd
  # leader > nothing.
  def match_card_big(match, tally, market_snapshot)
    # No cap once settled — the meta line's status badge already says 已结算.
    return { kind: :result, label: RESULT_LABEL[match.result], cap: match.settled? ? nil : "待结算" } if match.result.present?

    allows_draw = match.allows_draw?
    market = market_pcts(market_snapshot, allows_draw)
    leader = market && market_leader(market)
    if leader
      return {
        kind: :market,
        short: PICK_SHORT[leader[:pick]],
        pct: leader[:pct],
        divergence: divergence_label(match, market, tally, allows_draw, leader[:pick])
      }
    end

    crowd = crowd_leader(tally, allows_draw)
    if crowd
      crowd_odds = VoteOdds.from_tally(tally, allows_draw: allows_draw)
      decimal = crowd_odds&.public_send("d_#{crowd[:pick]}")
      return {
        kind: :crowd,
        short: PICK_SHORT[crowd[:pick]],
        pct: crowd[:pct],
        cap: decimal ? "赔率 #{format_decimal(decimal)}x" : "暂无市场对照"
      }
    end

    { kind: :none }
  end

  # --- detail-page odds comparison (ported from OddsCompare.tsx) ---

  def odds_clamp_width(probability)
    return 0 if probability.nil?

    (probability.clamp(0.0, 1.0) * 100).round
  end

  def odds_pct_text(probability)
    probability.nil? ? "—" : "#{(probability.clamp(0.0, 1.0) * 100).round}%"
  end

  # Outcome to feature (largest bar): highest market probability, else highest
  # crowd probability, else -1.
  def odds_featured_index(outcomes)
    max_index_by(outcomes) { |o| o[:market_p] } ||
      max_index_by(outcomes) { |o| o[:crowd_p] } || -1
  end

  # Outcome with the widest market-vs-crowd gap (crowd must have stake).
  def odds_lead_index(outcomes)
    best_index = -1
    best_diff = -1
    outcomes.each_with_index do |o, i|
      next if o[:crowd_p].nil? || o[:crowd_p] <= 0 || o[:market_p].nil?

      diff = (o[:market_p] - o[:crowd_p]).abs
      best_index, best_diff = i, diff if diff > best_diff
    end
    best_index
  end

  def odds_lead_label(crowd_p, market_p, featured)
    return nil if crowd_p.nil? || market_p.nil?

    diff = ((market_p - crowd_p) * 100).round
    return nil if diff.abs < VoteOdds::LEAD_DIVERGENCE_PCT

    if diff > 0
      tag.span("市场更看好", class: [ "o-lead", "mk-lead", ("strong" if featured) ].compact.join(" "))
    else
      tag.span("同事更看好", class: "o-lead cr-lead")
    end
  end

  private

  def max_index_by(outcomes)
    best_index = nil
    best_value = nil
    outcomes.each_with_index do |o, i|
      value = yield(o)
      next if value.nil?

      best_index, best_value = i, value if best_value.nil? || value > best_value
    end
    best_index
  end

  def odds_pct(probability)
    probability.nil? ? nil : (probability * 100).round
  end

  def market_pcts(snapshot, allows_draw)
    return nil unless snapshot

    {
      "home" => odds_pct(snapshot.p_home),
      "draw" => allows_draw ? odds_pct(snapshot.p_draw) : nil,
      "away" => odds_pct(snapshot.p_away)
    }
  end

  def market_leader(market)
    best = nil
    Match::PICKS.each do |pick|
      value = market[pick]
      next if value.nil?
      best = { pick: pick, pct: value } if best.nil? || value > best[:pct]
    end
    best
  end

  def crowd_leader(tally, allows_draw)
    return nil unless tally.stake_total.positive?

    entries = { "home" => tally.home, "draw" => allows_draw ? tally.draw : -1, "away" => tally.away }
    pick, value = entries.max_by { |_, v| v }
    { pick: pick, pct: (value / tally.stake_total * 100).round }
  end

  # Largest market-vs-crowd gap; returns the spark label when it clears the
  # LEAD_DIVERGENCE_PCT threshold, else nil.
  def divergence_label(_match, market, tally, allows_draw, leader_pick)
    best = nil
    Match::PICKS.each do |pick|
      market_pct = market[pick]
      crowd_pct = crowd_pct_for(tally, pick, allows_draw)
      next if market_pct.nil? || crowd_pct.nil? || crowd_pct <= 0

      diff = market_pct - crowd_pct
      best = { pick: pick, diff: diff } if best.nil? || diff.abs > best[:diff].abs
    end
    return nil if best.nil? || best[:diff].abs < VoteOdds::LEAD_DIVERGENCE_PCT

    market_leads = best[:diff] > 0
    same_as_shown = best[:pick] == leader_pick
    text = (market_leads ? "市场更看好" : "同事更看好") + (same_as_shown ? "" : PICK_SHORT[best[:pick]])
    { tone: market_leads ? "mk" : "cr", text: text }
  end

  def crowd_pct_for(tally, pick, allows_draw)
    return nil if tally.voters.zero?
    return nil if pick == "draw" && !allows_draw

    (tally.public_send(pick) / tally.stake_total * 100).round
  end
end
