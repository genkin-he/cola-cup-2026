FactoryBot.define do
  factory :odds_snapshot do
    match
    source { "vote" }
    locked { false }
    taken_at { Time.current }
    p_home { 0.5 }
    p_away { 0.5 }
    d_home { 2.0 }
    d_away { 2.0 }
  end
end
