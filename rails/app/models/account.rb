class Account < ApplicationRecord
  belongs_to :user

  validates :provider, presence: true
  validates :provider_account_id, presence: true,
    uniqueness: { scope: :provider }
end
