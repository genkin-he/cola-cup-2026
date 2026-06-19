module Standings
  # A single World Cup group ("Group A".."Group L"). There is no Group model — a
  # group is just the group-stage matches that share a `group_name`. The standings
  # math lives in build_rows; instances carry the matches too (for the group page's
  # fixture list), while the cross-page consumers use the cached `.tables`.
  class Group
    LETTER_RE = /\AGroup ([A-L])\z/

    class << self
      # All group tables keyed by letter, cached until the next result change.
      # Rows are plain value objects, so this serializes cleanly. Used by the
      # knockout predictor and the third-place ranking (the hot, cross-page path).
      def tables
        Rails.cache.fetch("standings/tables/#{Standings.signature}", expires_in: 12.hours) do
          group_matches.group_by(&:group_name).sort
            .to_h { |name, matches| [ name[LETTER_RE, 1], build_rows(matches) ] }
        end
      end

      # One group with its matches loaded — for the group page (table + fixtures).
      def find(letter)
        name = "Group #{letter}"
        matches = group_matches.where(group_name: name).to_a
        raise ActiveRecord::RecordNotFound, "Unknown group #{letter.inspect}" if matches.empty?

        new(name: name, letter: letter, rows: build_rows(matches), matches: matches)
      end

      def build_rows(matches)
        table = {}
        matches.each do |match|
          [ match.home_team, match.away_team ].each do |team|
            next unless team

            table[team.id] ||= Row.new(
              team_id: team.id, name: team.name, name_zh: team.name_zh, flag: team.flag,
              played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0
            )
          end
        end

        matches.each { |match| tally(table, match) }
        table.values.sort_by(&SORT_KEY)
      end

      private

      def group_matches
        Match.where(stage: "group").where.not(group_name: nil)
          .includes(:home_team, :away_team).order(:kickoff_at)
      end

      def tally(table, match)
        return if match.result.blank? || match.home_score.nil? || match.away_score.nil?

        home = table[match.home_team_id]
        away = table[match.away_team_id]
        return unless home && away

        accumulate(home, match.home_score, match.away_score, match.result, "home")
        accumulate(away, match.away_score, match.home_score, match.result, "away")
      end

      # `result` is stored from the home team's perspective ("home"/"away"/"draw");
      # `side` is the perspective of the row being updated.
      def accumulate(row, goals_for, goals_against, result, side)
        row.played += 1
        row.goals_for += goals_for
        row.goals_against += goals_against
        if result == "draw"
          row.drawn += 1
        elsif result == side
          row.won += 1
        else
          row.lost += 1
        end
      end
    end

    attr_reader :name, :letter, :rows, :matches

    def initialize(name:, letter:, rows:, matches: nil)
      @name = name
      @letter = letter
      @rows = rows
      @matches = matches
    end

    # The third-placed team's row, or nil before a third place exists.
    def third_place
      rows[2]
    end
  end
end
