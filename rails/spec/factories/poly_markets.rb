FactoryBot.define do
  factory :poly_market do
    match
    sequence(:slug) { |n| "world-cup-match-#{n}" }
    closed { false }
  end
end
