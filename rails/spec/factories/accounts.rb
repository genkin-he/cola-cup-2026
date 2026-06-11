FactoryBot.define do
  factory :account do
    user
    provider { "twitter" }
    sequence(:provider_account_id) { |n| "tw-#{n}" }
    sequence(:username) { |n| "handle#{n}" }
  end
end
