# Redeemable drinks and their credit cost per bottle. Credits are denominated
# in 可乐 (1 credit = 1 cola); pricier drinks cost more per bottle. Single
# source of truth — edit here to change the menu or prices.
Drink = Struct.new(:key, :name, :emoji, :cost)

class Drink
  ALL = [
    new("cola", "可乐", "🥤", 1.0),
    new("icetea", "各种茶", "🧋", 1.5),
    new("alien", "外星人", "👽", 1.5),
    new("redbull", "红牛", "🐂", 2.5)
  ].freeze

  def self.find(key)
    ALL.find { |drink| drink.key == key }
  end
end
