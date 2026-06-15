# Normalize a single corporate-proxy setting into the env vars each outbound
# HTTP stack actually reads. Two stacks disagree on which var to honour for the
# SAME https request:
#   - Net::HTTP (HttpJson: Polymarket / openfootball / football-data) only
#     consults http_proxy, even for https (it hardcodes the "http" scheme).
#   - Faraday  (oauth2 / omniauth: X OAuth2 token+userinfo, OIDC) consults
#     https_proxy for https targets.
# Operators set ONE value (OUTBOUND_HTTP_PROXY); we mirror it across all four
# spellings so every call is covered. A deliberately non-standard input name
# keeps Thruster/curl (which read HTTP_PROXY/http_proxy) unaffected, so
# in-container traffic to localhost stays direct. Hosts in OUTBOUND_NO_PROXY /
# NO_PROXY bypass the proxy; localhost is always excluded.
module HttpProxy
  STANDARD_PROXY_KEYS = %w[HTTP_PROXY http_proxy HTTPS_PROXY https_proxy].freeze
  ALWAYS_BYPASS = %w[localhost 127.0.0.1 ::1].freeze

  module_function

  def normalize_env!(env = ENV)
    proxy = env["OUTBOUND_HTTP_PROXY"].presence ||
            env["HTTPS_PROXY"].presence || env["https_proxy"].presence ||
            env["HTTP_PROXY"].presence  || env["http_proxy"].presence
    return unless proxy

    STANDARD_PROXY_KEYS.each { |key| env[key] = proxy }

    bypass = [ env["OUTBOUND_NO_PROXY"], env["NO_PROXY"], env["no_proxy"], *ALWAYS_BYPASS ]
             .flat_map { |value| value.to_s.split(",") }
             .map(&:strip).compact_blank.uniq.join(",")
    env["NO_PROXY"] = env["no_proxy"] = bypass
  end
end
