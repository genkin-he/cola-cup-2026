class PolyMarket < ApplicationRecord
  belongs_to :match

  validates :match_id, uniqueness: true
end
