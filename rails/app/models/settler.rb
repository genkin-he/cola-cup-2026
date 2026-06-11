# A settler is any logged-in user with a linked account whose provider handle
# or provider account id is listed in SETTLER_USERNAMES (comma-separated, "@"
# and case insensitive). Settlers can access the settlement admin.
module Settler
  module_function

  def handles
    (ENV["SETTLER_USERNAMES"] || "")
      .split(",")
      .map { |entry| entry.strip.downcase.delete_prefix("@") }
      .reject(&:empty?)
      .to_set
  end

  def settler?(user)
    return false unless user

    allowed = handles
    return false if allowed.empty?

    user.accounts.any? do |account|
      (account.username.present? && allowed.include?(account.username.downcase)) ||
        allowed.include?(account.provider_account_id.to_s.downcase)
    end
  end
end
