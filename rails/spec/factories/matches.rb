FactoryBot.define do
  factory :match do
    sequence(:external_key) { |n| "match-#{n}" }
    stage { "group" }
    group_name { "A" }
    association :home_team, factory: :team
    association :away_team, factory: :team
    kickoff_at { 3.days.from_now }
    settled { false }

    # Within the vote window, both teams set -> status :open.
    trait :knockout do
      stage { "r16" }
      group_name { nil }
    end

    trait :with_result do
      result { "home" }
      home_score { 2 }
      away_score { 1 }
      result_at { Time.current }
    end

    trait :settled do
      with_result
      settled { true }
    end

    # No teams determined yet -> not bettable (status :upcoming inside window).
    trait :no_teams do
      home_team { nil }
      away_team { nil }
      home_label { "A1" }
      away_label { "B2" }
    end

    trait :scheduled do
      kickoff_at { 30.days.from_now }
    end

    trait :locked do
      kickoff_at { 30.minutes.from_now }
    end
  end
end
