class Team < ApplicationRecord
  has_many :home_matches, class_name: "Match", foreign_key: :home_team_id, dependent: :nullify, inverse_of: :home_team
  has_many :away_matches, class_name: "Match", foreign_key: :away_team_id, dependent: :nullify, inverse_of: :away_team

  validates :name, presence: true, uniqueness: true

  # Chinese display name when present, English name otherwise (used everywhere
  # the team is shown to players; English stays as the Polymarket-matching key).
  def display_name
    name_zh.presence || name
  end
end
