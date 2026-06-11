require "rails_helper"

RSpec.describe Users::AuthFailure, ".reason_for" do
  FakeResponse = Struct.new(:status, :body, :headers) unless defined?(FakeResponse)
  FakeError = Struct.new(:response) unless defined?(FakeError)

  def error(status: 200, body: "", headers: {})
    FakeError.new(FakeResponse.new(status, body, headers))
  end

  it "flags a suspended account from the response body (TTL 300)" do
    reason = described_class.reason_for(error(status: 403, body: '{"detail":"user-suspended"}'))
    expect(reason).to eq(value: "suspended", ttl: 300)
  end

  it "flags a 429 rate limit and carries the reset epoch, floored to 60s TTL" do
    now = Time.zone.at(1_700_000_000)
    reset = 1_700_000_030 # 30s out -> below the 60s floor

    reason = described_class.reason_for(
      error(status: 429, headers: { "x-rate-limit-reset" => reset.to_s }), now: now
    )

    expect(reason[:value]).to eq("rate_limited:#{reset}")
    expect(reason[:ttl]).to eq(60)
  end

  it "uses the remaining seconds as TTL when the reset is further out" do
    now = Time.zone.at(1_700_000_000)
    reset = 1_700_000_500 # 500s out

    reason = described_class.reason_for(
      error(status: 429, headers: { "x-rate-limit-reset" => reset.to_s }), now: now
    )

    expect(reason[:ttl]).to eq(500)
  end

  it "is nil for a 429 without a reset header" do
    expect(described_class.reason_for(error(status: 429))).to be_nil
  end

  it "is nil for a generic failure (no response, non-429, no marker)" do
    expect(described_class.reason_for(error(status: 500, body: "boom"))).to be_nil
    expect(described_class.reason_for(Object.new)).to be_nil
    expect(described_class.reason_for(nil)).to be_nil
  end
end
