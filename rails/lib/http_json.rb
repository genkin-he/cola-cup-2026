require "net/http"
require "json"
require "uri"

# Minimal JSON-over-HTTP client built on Net::HTTP (no Faraday dependency).
# Ported from the legacy src/lib/jobs/http.ts: sends a User-Agent, follows
# redirects, and retries on 429 / 5xx with exponential backoff, honouring a
# numeric Retry-After header when present.
module HttpJson
  USER_AGENT = "cup-worldcup/1.0 (internal coke-betting tool)".freeze
  DEFAULT_RETRIES = 3
  DEFAULT_BASE_DELAY = 1.0
  MAX_REDIRECTS = 5
  OPEN_TIMEOUT = 10
  READ_TIMEOUT = 30

  class Error < StandardError; end

  module_function

  def get(url, headers: {}, retries: DEFAULT_RETRIES, base_delay: DEFAULT_BASE_DELAY)
    attempt = 0
    loop do
      response = request_with_redirects(url, headers)
      return JSON.parse(response.body) if response.is_a?(Net::HTTPSuccess)

      status = response.code.to_i
      retryable = status == 429 || status >= 500
      raise Error, "HTTP #{status} for #{url}" unless retryable && attempt < retries

      sleep(retry_delay(response, attempt, base_delay))
      attempt += 1
    end
  end

  def request_with_redirects(url, headers)
    uri = URI.parse(url)
    redirects = 0
    loop do
      response = perform(uri, headers)
      return response unless response.is_a?(Net::HTTPRedirection)

      raise Error, "Too many redirects for #{url}" if redirects >= MAX_REDIRECTS

      location = response["location"]
      raise Error, "Redirect without Location for #{url}" if location.nil?

      uri = URI.join(uri.to_s, location)
      redirects += 1
    end
  end

  def perform(uri, headers)
    request = Net::HTTP::Get.new(uri)
    request["User-Agent"] = USER_AGENT
    headers.each { |name, value| request[name] = value }

    Net::HTTP.start(
      uri.host, uri.port,
      use_ssl: uri.scheme == "https",
      open_timeout: OPEN_TIMEOUT,
      read_timeout: READ_TIMEOUT
    ) { |http| http.request(request) }
  end

  def retry_delay(response, attempt, base_delay)
    retry_after = response["retry-after"].to_f
    return retry_after if retry_after.positive?

    base_delay * (2**attempt)
  end
end
