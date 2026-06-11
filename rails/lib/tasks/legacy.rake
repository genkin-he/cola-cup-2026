# Imports the legacy Next.js SQLite database (cup.db) into the Rails schema.
#
#   bin/rails "legacy:import[/path/to/cup.db]"
#
# Reads the old database through a second, read-only SQLite connection and copies
# every table into the new models inside a single transaction (any error rolls the
# whole import back, so it is safe to retry). Original primary keys are preserved
# so all foreign keys keep pointing at the same rows. After the new schema is in
# place a fresh `cup:import_schedule` can refresh fixtures by external_key without
# changing ids.
#
# Legacy → Rails conversions:
#   * millisecond integer timestamps        → Time (UTC)
#   * 0/1 integer flags                     → boolean
#   * odds_snapshot.is_locked               → odds_snapshots.locked
#   * ledger                                → ledger_entries
#   * users get encrypted_password = ""     (Devise placeholder, OAuth-only login)
#
# NOTE: field mapping is reconciled against the real db/schema.rb produced by the
# models task (#2). Re-verify column names here whenever that schema changes.

namespace :legacy do
  IMPORT_ORDER = %w[
    users accounts teams settlements matches
    poly_markets odds_snapshots votes ledger_entries redemptions
  ].freeze

  # Maps a target table to the legacy table it is sourced from (when they differ).
  LEGACY_SOURCE_TABLE = {
    "odds_snapshots" => "odds_snapshot",
    "ledger_entries" => "ledger"
  }.freeze

  desc "Import a legacy cup.db into the Rails databases: legacy:import[/path/to/cup.db]"
  task :import, [ :path ] => :environment do |_task, args|
    path = args[:path]
    abort "Usage: bin/rails \"legacy:import[/path/to/cup.db]\"" if path.blank?
    abort "Legacy database not found: #{path}" unless File.exist?(path)

    require "sqlite3"
    legacy = SQLite3::Database.new(path, readonly: true)
    legacy.results_as_hash = true

    ms_to_time = ->(ms) { ms.nil? ? nil : Time.at(Integer(ms) / 1000.0).utc }
    to_bool = ->(value) { value.to_i == 1 }
    parse_aliases = lambda do |raw|
      return nil if raw.blank?
      JSON.parse(raw)
    rescue JSON::ParserError
      raw
    end

    # Legacy `teams`/`matches` rows have no timestamps and `poly_markets.updated_at`
    # may be NULL; backfill the schema's required NOT NULL columns with the import time.
    import_time = Time.current

    read = ->(table) { legacy.execute("SELECT * FROM #{table}") }
    legacy_has_table = lambda do |table|
      legacy.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1", [ table ]
      ).any?
    end

    models = {
      "users" => User, "accounts" => Account, "teams" => Team,
      "settlements" => Settlement, "matches" => Match, "poly_markets" => PolyMarket,
      "odds_snapshots" => OddsSnapshot, "votes" => Vote,
      "ledger_entries" => LedgerEntry, "redemptions" => Redemption
    }

    # Guard: every target table must be empty so ids never collide.
    non_empty = IMPORT_ORDER.select { |table| models.fetch(table).exists? }
    unless non_empty.empty?
      abort "Target tables already contain data: #{non_empty.join(', ')}. " \
            "Reset the database (bin/rails db:reset) before importing."
    end

    row_builders = {
      "users" => ->(r) {
        {
          id: r["id"], nickname: r["nickname"], avatar_url: r["avatar_url"],
          emoji: r["emoji"], encrypted_password: "",
          deleted_at: ms_to_time.call(r["deleted_at"]),
          created_at: ms_to_time.call(r["created_at"]),
          updated_at: ms_to_time.call(r["created_at"])
        }
      },
      "accounts" => ->(r) {
        {
          id: r["id"], user_id: r["user_id"], provider: r["provider"],
          provider_account_id: r["provider_account_id"], username: r["username"],
          avatar_url: r["avatar_url"],
          created_at: ms_to_time.call(r["created_at"]),
          updated_at: ms_to_time.call(r["created_at"])
        }
      },
      "teams" => ->(r) {
        {
          id: r["id"], code: r["code"], name: r["name"], name_zh: r["name_zh"],
          flag: r["flag"], confed: r["confed"], aliases: parse_aliases.call(r["aliases"]),
          created_at: import_time, updated_at: import_time
        }
      },
      "settlements" => ->(r) {
        {
          id: r["id"], created_by_id: r["created_by"], match_count: r["match_count"],
          created_at: ms_to_time.call(r["created_at"]),
          updated_at: ms_to_time.call(r["created_at"])
        }
      },
      "matches" => ->(r) {
        {
          id: r["id"], external_key: r["external_key"], group_name: r["group_name"],
          stage: r["stage"], home_team_id: r["home_team_id"], away_team_id: r["away_team_id"],
          home_label: r["home_label"], away_label: r["away_label"], venue: r["venue"],
          kickoff_at: ms_to_time.call(r["kickoff_at"]), result: r["result"],
          home_score: r["home_score"], away_score: r["away_score"],
          result_at: ms_to_time.call(r["result_at"]), settled: to_bool.call(r["settled"]),
          settlement_id: r["settlement_id"],
          created_at: import_time, updated_at: import_time
        }
      },
      "poly_markets" => ->(r) {
        {
          match_id: r["match_id"], event_id: r["event_id"], slug: r["slug"],
          condition_id: r["condition_id"], token_home: r["token_home"],
          token_draw: r["token_draw"], token_away: r["token_away"],
          match_method: r["match_method"], match_score: r["match_score"],
          closed: to_bool.call(r["closed"]),
          created_at: ms_to_time.call(r["updated_at"]) || import_time,
          updated_at: ms_to_time.call(r["updated_at"]) || import_time
        }
      },
      "odds_snapshots" => ->(r) {
        {
          id: r["id"], match_id: r["match_id"], source: r["source"],
          locked: to_bool.call(r["is_locked"]),
          p_home: r["p_home"], p_draw: r["p_draw"], p_away: r["p_away"],
          d_home: r["d_home"], d_draw: r["d_draw"], d_away: r["d_away"],
          taken_at: ms_to_time.call(r["taken_at"]),
          created_at: ms_to_time.call(r["taken_at"]),
          updated_at: ms_to_time.call(r["taken_at"])
        }
      },
      "votes" => ->(r) {
        {
          id: r["id"], match_id: r["match_id"], user_id: r["user_id"],
          pick: r["pick"], stake: r["stake"],
          created_at: ms_to_time.call(r["created_at"]),
          updated_at: ms_to_time.call(r["updated_at"])
        }
      },
      "ledger_entries" => ->(r) {
        {
          id: r["id"], match_id: r["match_id"], user_id: r["user_id"],
          pick: r["pick"], stake: r["stake"], d_used: r["d_used"],
          won: to_bool.call(r["won"]), delta: r["delta"],
          created_at: ms_to_time.call(r["created_at"]),
          updated_at: ms_to_time.call(r["created_at"])
        }
      },
      "redemptions" => ->(r) {
        {
          id: r["id"], user_id: r["user_id"], drink: r["drink"], qty: r["qty"],
          unit_cost: r["unit_cost"], cost: r["cost"],
          created_at: ms_to_time.call(r["created_at"]),
          updated_at: ms_to_time.call(r["created_at"])
        }
      }
    }

    ActiveRecord::Base.transaction do
      IMPORT_ORDER.each do |table|
        source = LEGACY_SOURCE_TABLE.fetch(table, table)
        unless legacy_has_table.call(source)
          warn "[legacy] source table '#{source}' missing — skipping #{table}"
          next
        end

        rows = read.call(source).map(&row_builders.fetch(table))
        next if rows.empty?

        models.fetch(table).insert_all(rows)
        puts "[legacy] imported #{rows.size} row(s) into #{table}"
      end
    end

    puts "\n=== Row-count reconciliation (legacy → rails) ==="
    IMPORT_ORDER.each do |table|
      source = LEGACY_SOURCE_TABLE.fetch(table, table)
      legacy_count = legacy_has_table.call(source) ? legacy.get_first_value("SELECT COUNT(*) FROM #{source}") : "—"
      rails_count = models.fetch(table).count
      flag = (legacy_count == rails_count) ? "✓" : "✗"
      puts format("  %-16s legacy=%-6s rails=%-6s %s", table, legacy_count, rails_count, flag)
    end
  ensure
    legacy&.close
  end
end
