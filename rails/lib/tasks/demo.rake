namespace :demo do
  desc "Give real users (agentplay/Das) scores via settled matches + stage matches awaiting settlement (dev only)"
  task enrich: :environment do
    abort "demo:enrich is development-only" unless Rails.env.development?

    real_users = %w[agentplay Das].map do |name|
      User.find_by(nickname: name) or abort "user #{name} not found — sign in first"
    end
    demo_users = User.joins(:accounts).where(accounts: { provider_account_id: Account
      .where("provider_account_id LIKE 'demo-%'").select(:provider_account_id) }).distinct.to_a
    abort "run demo:seed first" if demo_users.size < 4
    everyone = real_users + demo_users

    fresh = Match.where(settled: false).chronological
                 .reject { |m| m.votes.exists? || !m.bettable? }.first(5)
    abort "not enough fresh matches" if fresh.size < 5

    cast = lambda do |match, picks_by_user|
      picks_by_user.each do |user, pick|
        next unless match.valid_picks.include?(pick)

        Vote.find_or_initialize_by(match: match, user: user).update!(pick: pick, stake: match.stake)
      end
    end

    # Two matches kicked off yesterday: real users picked the winner, settle now.
    fresh.first(2).each do |match|
      match.update!(kickoff_at: 26.hours.ago)
      cast.call(match, real_users.map { |u| [ u, "home" ] }.to_h
        .merge(demo_users[0] => "away", demo_users[1] => "away",
               demo_users[2] => "draw", demo_users[3] => "away"))
      match.record_result!(home_score: 2, away_score: 0)
      Settlement.commit!([ match.id ], settler: real_users.first)
    end

    # Three matches kicked off this morning, votes in, NOT settled:
    # two with scores recorded (ready to settle), one left for manual score entry.
    pending = fresh.last(3)
    pending.each_with_index do |match, i|
      match.update!(kickoff_at: (3 + i).hours.ago)
      shuffled = %w[home away draw home away home]
      cast.call(match, everyone.each_with_index.to_h { |u, j| [ u, shuffled[j] ] })
    end
    pending[0].record_result!(home_score: 2, away_score: 1)
    pending[1].record_result!(home_score: 1, away_score: 1)

    puts "scored:   #{real_users.map { |u| "#{u.nickname} #{format("%+.1f", u.net_balance)}" }.join(" / ")}"
    puts "settled:  matches #{fresh.first(2).map(&:id).join(", ")} (2:0, real users won)"
    puts "awaiting settlement (/admin): " \
         "##{pending[0].id} 比分已录 2:1 · ##{pending[1].id} 比分已录 1:1 平 · ##{pending[2].id} 待录比分"
    puts "note: kickoff times of these 5 matches were shifted into the past for the demo;"
    puts "      the daily ImportScheduleJob (or cup:import_schedule) restores real times."
  end

  desc "Dev only: pull openfootball scores+results+goals so finished matches render (prod scores come from football-data.org)"
  task results: :environment do
    abort "demo:results is development-only" unless Rails.env.development?

    # Goals + fixtures (idempotent). In production this same call runs every few
    # hours via ImportScheduleJob and backfills goals for every played match.
    Openfootball::ScheduleImport.run(source: :network)

    # openfootball also carries the final score per played match; football-data.org
    # owns scores in production, so we only borrow them here (dev) to give finished
    # matches a result/score to render. update_all bypasses settlement/broadcast.
    payload = HttpJson.get(Openfootball::ScheduleImport::SCHEDULE_URL)
    by_key = Match.pluck(:external_key, :id).to_h
    updated = 0
    Array(payload["matches"]).each do |match|
      home, away = match.dig("score", "ft")
      next unless home.is_a?(Integer) && away.is_a?(Integer)

      key = match["num"] ? "m:#{match["num"]}" : "#{match["round"]}|#{match["date"]}|#{match["team1"]}|#{match["team2"]}"
      id = by_key[key]
      next unless id

      result = home > away ? "home" : (home < away ? "away" : "draw")
      Match.where(id: id).update_all(home_score: home, away_score: away, result: result, result_at: Time.current)
      updated += 1
    end

    puts "[demo:results] scores+results set on #{updated} played matches; goals=#{Goal.count}"
    puts "note: dev-only — production scores come from football-data.org (cup:sync_live)"
  end

  desc "Seed demo users/votes/one settled match/one redemption for local testing (dev only)"
  task seed: :environment do
    abort "demo:seed is development-only" unless Rails.env.development?

    profiles = [
      { nickname: "西瓜",   emoji: "🍉", handle: "demo_xigua" },
      { nickname: "火箭",   emoji: "🚀", handle: "demo_huojian" },
      { nickname: "滚石",   emoji: "🪨", handle: "demo_gunshi" },
      { nickname: "茶壶",   emoji: "🫖", handle: "demo_chahu" }
    ]
    users = profiles.map do |p|
      account = Account.find_by(provider: "twitter", provider_account_id: "demo-#{p[:handle]}")
      next account.user if account

      user = User.create!(nickname: p[:nickname], emoji: p[:emoji], encrypted_password: "")
      user.accounts.create!(provider: "twitter", provider_account_id: "demo-#{p[:handle]}",
                            username: p[:handle])
      user
    end

    open_matches = Match.chronological.select { |m| m.status == :open }.first(8)
    abort "no open matches — run db:seed first" if open_matches.empty?

    rotations = [
      %w[home home away],
      %w[home draw away home],
      %w[away away home],
      %w[home home home draw]
    ]
    votes = 0
    open_matches.each_with_index do |match, index|
      picks = rotations[index % rotations.size] & match.valid_picks
      users.zip(picks).each do |user, pick|
        next unless pick

        vote = Vote.find_or_initialize_by(match: match, user: user)
        vote.update!(pick: pick, stake: match.stake)
        votes += 1
      end
    end

    settled_ids = open_matches.first(2).reject { |m| m.reload.settled? }.map do |match|
      match.record_result!(home_score: 2, away_score: 1)
      Settlement.commit!([ match.id ], settler: users.first)
      match.id
    end

    top_winner = users.max_by(&:net_balance)
    redeem_summary =
      if top_winner.net_balance >= 1
        Redemption.redeem!(user: top_winner, drink_key: "cola", qty: 1)
        "#{top_winner.nickname} redeemed cola, balance #{top_winner.net_balance.round(2)}"
      else
        "skipped (top balance #{top_winner.net_balance.round(2)} < 1)"
      end

    puts "demo users:    #{users.map(&:nickname).join(" / ")}"
    puts "votes upserted: #{votes} across #{open_matches.size} open matches"
    puts "settled:       #{settled_ids.any? ? "matches #{settled_ids.join(", ")} (2:1)" : "skipped (already settled)"}"
    puts "redemption:    #{redeem_summary}"
    puts "reset anytime: rm -f storage/development*.sqlite3* && bin/rails db:prepare"
  end
end
