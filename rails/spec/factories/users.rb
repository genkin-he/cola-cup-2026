FactoryBot.define do
  factory :user do
    sequence(:nickname) { |n| "球迷#{n}" }
    encrypted_password { "" }

    trait :deleted do
      deleted_at { Time.current }
    end

    trait :with_account do
      after(:create) { |user| create(:account, user: user) }
    end
  end
end
