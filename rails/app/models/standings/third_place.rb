module Standings
  # Cross-group ranking of the twelve group third-placed teams. Under the 2026
  # 48-team format the eight best third-placed teams advance to the round of 32,
  # so the table draws a qualification line after QUALIFYING_SLOTS. Ranking is
  # points -> goal difference -> goals scored; no head-to-head (these teams never
  # met). Computed from the cached group tables, so it inherits their caching.
  class ThirdPlace
    QUALIFYING_SLOTS = 8

    Entry = Struct.new(:letter, :row, :rank, :qualified, keyword_init: true)

    # `tables` is injectable so a caller that already loaded them (the knockout
    # predictor) doesn't trigger a second cache lookup.
    def self.ranked(tables = Standings::Group.tables)
      thirds = tables.filter_map { |letter, rows| [ letter, rows[2] ] if rows[2] }

      thirds.sort_by { |(_letter, row)| SORT_KEY.call(row) }
        .each_with_index.map do |(letter, row), index|
          Entry.new(letter: letter, row: row, rank: index + 1, qualified: index < QUALIFYING_SLOTS)
        end
    end
  end
end
