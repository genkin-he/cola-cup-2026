class Redemption < ApplicationRecord
  # Float tolerance — credits can be fractional (e.g. 1.5), so a balance that is
  # cost-exact can land a hair below cost after summation.
  EPSILON = 1e-9

  RedeemError = Class.new(StandardError)

  belongs_to :user

  validates :drink, presence: true
  validates :qty, numericality: { only_integer: true, greater_than: 0 }
  validates :unit_cost, :cost, presence: true

  # A redemption shifts the 已兑 column on the leaderboard (rank itself unchanged).
  after_commit :broadcast_leaderboard_change, on: :create

  def broadcast_leaderboard_change
    Broadcasts::LeaderboardJob.perform_later
  end

  # Redeem `qty` bottles of a drink, deducting credits from the available
  # balance. Atomic: the balance is re-read inside the transaction so a stale
  # client number can never overspend. Raises RedeemError (Chinese message) on
  # an unknown drink, a non-positive quantity, or an insufficient balance.
  def self.redeem!(user:, drink_key:, qty:)
    drink = Drink.find(drink_key)
    raise RedeemError, "未知饮料" unless drink
    raise RedeemError, "兑换数量需为正整数" unless qty.is_a?(Integer) && qty >= 1

    cost = drink.cost * qty
    transaction do
      balance = user.net_balance
      if balance + EPSILON < cost
        raise RedeemError,
          "可用额度不足（需 #{format('%.1f', cost)}，余 #{format('%.1f', balance)}）"
      end

      create!(user: user, drink: drink.key, qty: qty, unit_cost: drink.cost, cost: cost)
    end
  end
end
