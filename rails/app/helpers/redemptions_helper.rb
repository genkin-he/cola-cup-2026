module RedemptionsHelper
  # Credit amount without a trailing ".0": 1 -> "1", 1.5 -> "1.5". Mirrors the
  # legacy fmtCredits used in the redeem panel and redemption records.
  def format_credits(value)
    number = value.to_f
    number == number.to_i ? number.to_i.to_s : format("%.1f", number)
  end
end
