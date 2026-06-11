FactoryBot.define do
  factory :vote do
    match
    user
    pick { "home" }
    stake { 1.0 }
  end
end
