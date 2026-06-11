# Seed teams + the full 2026 World Cup fixture list from the openfootball JSON
# vendored under db/data/openfootball. Runs offline (source: :vendor) and is
# idempotent: re-running refreshes existing rows by team name / match
# external_key without creating duplicates.
result = Openfootball::ScheduleImport.run(source: :vendor)

message = "Seeded #{result[:teams]} teams and #{result[:matches]} matches from openfootball (offline vendor)."
Rails.logger.info("[seeds] #{message}")
puts message
