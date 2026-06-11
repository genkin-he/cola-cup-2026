FactoryBot.define do
  factory :team do
    sequence(:code) { |n| "T#{n}" }
    sequence(:name) { |n| "Team #{n}" }
    name_zh { "球队" }
    flag { "🏳️" }
    confed { "UEFA" }
    aliases { [] }
  end
end
