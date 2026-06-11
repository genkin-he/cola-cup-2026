FactoryBot.define do
  factory :redemption do
    user
    drink { "cola" }
    qty { 1 }
    unit_cost { 1.0 }
    cost { 1.0 }
  end
end
