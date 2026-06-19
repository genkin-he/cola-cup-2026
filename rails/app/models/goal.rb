class Goal < ApplicationRecord
  belongs_to :match
  belongs_to :team, optional: true

  validates :player_name, presence: true
end
