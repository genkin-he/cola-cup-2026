module FootballData
  # Pulls finished World Cup matches from football-data.org and records the
  # result + score onto any un-settled fixture we can match by team pair.
  # Ported from src/lib/jobs/syncResults.ts. This only records the result so the
  # match shows up pre-filled in the admin "待结算" list — it never settles, and
  # it never touches already-settled matches (so manual corrections survive).
  # No-op (not an error) when FOOTBALL_DATA_API_KEY is unset.
  class ResultsSync
    BASE = "https://api.football-data.org/v4".freeze
    WORLD_CUP_CODE = "WC".freeze

    def self.run
      new.run
    end

    def run
      key = ENV["FOOTBALL_DATA_API_KEY"]
      if key.blank?
        Rails.logger.info("[FootballData::ResultsSync] FOOTBALL_DATA_API_KEY not set — skipping.")
        return { recorded: 0, skipped: 0, unmatched: 0 }
      end

      data = HttpJson.get(
        "#{BASE}/competitions/#{WORLD_CUP_CODE}/matches?status=FINISHED",
        headers: { "X-Auth-Token" => key }
      )
      finished = Array(data["matches"])
      index = MatchIndex.build

      recorded = 0
      skipped = 0
      unmatched = 0

      finished.each do |fd|
        match_ref, fd_home_is_our_home = locate_match(fd, index)
        if match_ref.nil?
          unmatched += 1
          next
        end

        result = derive_result(fd, fd_home_is_our_home)
        if result.nil?
          skipped += 1
          next
        end

        match = Match.find_by(id: match_ref[:match_id])
        if match.nil? || match.settled?
          skipped += 1
          next
        end

        home_score, away_score = our_scores(fd, fd_home_is_our_home)
        begin
          match.record_result!(home_score: home_score, away_score: away_score, result: result)
          recorded += 1
        rescue Match::DomainError, ActiveRecord::RecordInvalid
          skipped += 1
        end
      end

      Rails.logger.info(
        "[FootballData::ResultsSync] finished=#{finished.size} recorded=#{recorded} " \
        "skipped=#{skipped} unmatched=#{unmatched}"
      )
      { recorded: recorded, skipped: skipped, unmatched: unmatched }
    end

    private

    # Returns [match_ref, fd_home_is_our_home] or [nil, nil] when unmatched.
    def locate_match(fd, index)
      home_name = fd.dig("homeTeam", "name")
      away_name = fd.dig("awayTeam", "name")
      home_id = home_name ? index.resolve_team(home_name) : nil
      away_id = away_name ? index.resolve_team(away_name) : nil
      return [ nil, nil ] if home_id.nil? || away_id.nil?

      match_ref = index.pair_match(home_id, away_id)
      return [ nil, nil ] if match_ref.nil?

      [ match_ref, home_id == match_ref[:home_id] ]
    end

    # Our-perspective result: prefer football-data's winner (covers ET/penalties),
    # fall back to the full-time score. fd_home_is_our_home maps their home/away
    # to ours.
    def derive_result(fd, fd_home_is_our_home)
      case fd.dig("score", "winner")
      when "HOME_TEAM" then return fd_home_is_our_home ? "home" : "away"
      when "AWAY_TEAM" then return fd_home_is_our_home ? "away" : "home"
      when "DRAW" then return "draw"
      end

      home, away = full_time_scores(fd)
      return nil if home.nil? || away.nil?

      our_home = fd_home_is_our_home ? home : away
      our_away = fd_home_is_our_home ? away : home
      return "home" if our_home > our_away
      return "away" if our_home < our_away

      "draw"
    end

    def our_scores(fd, fd_home_is_our_home)
      home, away = full_time_scores(fd)
      return [ nil, nil ] if home.nil? || away.nil?

      fd_home_is_our_home ? [ home, away ] : [ away, home ]
    end

    def full_time_scores(fd)
      full_time = fd.dig("score", "fullTime") || {}
      [ full_time["home"], full_time["away"] ]
    end
  end
end
