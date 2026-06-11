# Convert an implied probability into decimal odds, clamped away from the 0/1
# extremes so a degenerate price never yields infinite/zero odds. Ported from
# the legacy decimalOdds.ts (shared by manual odds entry and any odds display).
module DecimalOdds
  MIN_PROB = 0.001
  MAX_PROB = 0.999

  module_function

  def clamp_prob(price)
    return MIN_PROB unless price.is_a?(Numeric) && price.to_f.finite?

    price.to_f.clamp(MIN_PROB, MAX_PROB)
  end

  def price_to_decimal(price)
    1.0 / clamp_prob(price)
  end
end
