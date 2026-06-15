require "rails_helper"

RSpec.describe HttpProxy, ".normalize_env!" do
  let(:proxy) { "http://proxy.corp:8080" }

  it "mirrors OUTBOUND_HTTP_PROXY to every spelling the two HTTP stacks read" do
    env = { "OUTBOUND_HTTP_PROXY" => proxy }

    HttpProxy.normalize_env!(env)

    expect(env.values_at("HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy"))
      .to all(eq(proxy))
  end

  it "always excludes localhost from the proxy" do
    env = { "OUTBOUND_HTTP_PROXY" => proxy }

    HttpProxy.normalize_env!(env)

    %w[NO_PROXY no_proxy].each do |key|
      expect(env[key].split(",")).to include("localhost", "127.0.0.1", "::1")
    end
  end

  it "merges operator-supplied OUTBOUND_NO_PROXY hosts with the always-excluded set" do
    env = {
      "OUTBOUND_HTTP_PROXY" => proxy,
      "OUTBOUND_NO_PROXY" => "raw.githubusercontent.com, api.football-data.org"
    }

    HttpProxy.normalize_env!(env)

    expect(env["NO_PROXY"].split(","))
      .to include("raw.githubusercontent.com", "api.football-data.org", "localhost")
  end

  it "picks up a pre-existing standard proxy var and normalizes it across both stacks" do
    env = { "HTTPS_PROXY" => proxy }

    HttpProxy.normalize_env!(env)

    expect(env["http_proxy"]).to eq(proxy)
    expect(env["https_proxy"]).to eq(proxy)
  end

  it "leaves the environment untouched when no proxy is configured (direct connection)" do
    env = { "AUTH_TWITTER_ID" => "abc" }

    HttpProxy.normalize_env!(env)

    expect(env).to eq("AUTH_TWITTER_ID" => "abc")
  end

  it "treats a blank proxy value as unset" do
    env = { "OUTBOUND_HTTP_PROXY" => "" }

    HttpProxy.normalize_env!(env)

    expect(env).to eq("OUTBOUND_HTTP_PROXY" => "")
  end
end
