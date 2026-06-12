# Single source of truth for which login providers are enabled and how they are
# labelled. Read at call-time (not boot) so callers reflect the current ENV.
# Presence of the provider's key env var is the on/off switch.
module AuthProviders
  module_function

  def twitter_enabled?
    ENV["AUTH_TWITTER_ID"].present?
  end

  def oidc_enabled?
    ENV["OIDC_ISSUER"].present?
  end

  def oidc_display_name
    ENV["OIDC_DISPLAY_NAME"].presence || "OIDC 登录"
  end

  def any_enabled?
    twitter_enabled? || oidc_enabled?
  end
end
