# One-off data corrections. Each task is a dry-run by default (prints what it
# would change, writes nothing); set APPLY=1 to actually persist.
namespace :data_fix do
  desc "Refund matches settled with no winner (dry-run; APPLY=1 to write)"
  task refund_no_winner_matches: :environment do
    apply = ENV["APPLY"] == "1"

    # A settled match whose ledger has rows but no winning row means nobody
    # backed the result — under the old pari-mutuel rule everyone was charged
    # their stake and the pool vanished. Refund them: delta -> 0 (a push).
    with_entries = LedgerEntry.distinct.pluck(:match_id)
    with_winner = LedgerEntry.where(won: true).distinct.pluck(:match_id)
    affected = (with_entries - with_winner).sort

    if affected.empty?
      puts "[data_fix] No no-winner settlements found. Nothing to do."
      next
    end

    puts "[data_fix] Found #{affected.size} no-winner match(es): #{affected.inspect}"
    affected.each do |match_id|
      match = Match.find(match_id)
      entries = LedgerEntry.where(match_id: match_id)
      charged = entries.where.not(delta: 0).count
      puts format("  match %d  %s vs %s  result=%s  rows=%d  charged=%d  Σdelta=%.2f",
        match_id, match.home_label, match.away_label, match.result,
        entries.count, charged, entries.sum(:delta))
    end

    unless apply
      puts "\n[data_fix] DRY RUN — nothing written. Re-run with APPLY=1 to apply."
      next
    end

    ActiveRecord::Base.transaction do
      refunded = LedgerEntry.where(match_id: affected)
        .update_all(delta: 0.0, updated_at: Time.current)
      puts "\n[data_fix] Refunded #{refunded} ledger row(s) (delta -> 0)."
    end

    # The leaderboard is cached in Solid Cache under a signature that update_all
    # does NOT advance (no new ledger ids, no touched users), and Solid Cache 1.0
    # has no delete_matched. Since the signature is unchanged, the live key still
    # equals the freshly computed one — delete it so corrected totals show.
    Rails.cache.delete("#{User::LEADERBOARD_CACHE_KEY}/#{User.leaderboard_signature}")
    puts "[data_fix] Leaderboard cache invalidated."

    settlement_ids = affected.filter_map { |id| Match.find(id).settlement_id }.uniq
    settlement_ids.each { |sid| Broadcasts::SettlementJob.perform_later(sid) }
    puts "[data_fix] Re-broadcast #{settlement_ids.size} settlement(s)."
  end
end
