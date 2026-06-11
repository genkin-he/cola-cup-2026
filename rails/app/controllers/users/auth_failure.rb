module Users
  # Translates an X OAuth failure into the x_auth_error cookie consumed by the
  # /auth/error page. Mirrors the legacy authError.ts protocol so the player sees
  # a specific cause (suspended account / rate-limited) instead of a generic error.
  module AuthFailure
    COOKIE = "x_auth_error"
    SUSPENDED_MARKER = "user-suspended"
    SUSPENDED_TTL = 300
    RATE_LIMITED_STATUS = 429
    MIN_RATE_LIMITED_TTL = 60

    module_function

    # Returns { value:, ttl: } for the cookie, or nil when the failure is not one
    # of the two recognised X conditions (caller still 302s to /auth/error).
    def reason_for(error, now: Time.current)
      response = error.respond_to?(:response) ? error.response : nil
      return nil unless response

      return { value: "suspended", ttl: SUSPENDED_TTL } if response.body.to_s.include?(SUSPENDED_MARKER)

      reset = rate_limit_reset(response)
      return nil unless response.status == RATE_LIMITED_STATUS && reset

      { value: "rate_limited:#{reset}", ttl: [ MIN_RATE_LIMITED_TTL, reset - now.to_i ].max }
    end

    def rate_limit_reset(response)
      raw = response.headers && response.headers["x-rate-limit-reset"]
      raw.to_i if raw && raw.to_i.positive?
    end
  end
end
