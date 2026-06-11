FactoryBot.define do
  factory :ledger_entry do
    match
    user
    pick { "home" }
    stake { 1.0 }
    d_used { 2.0 }
    won { true }
    delta { 1.0 }
  end
end
