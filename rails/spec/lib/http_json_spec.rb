require "rails_helper"

RSpec.describe HttpJson do
  let(:url) { "https://example.test/data.json" }

  before { allow(HttpJson).to receive(:sleep) }

  it "parses the JSON body and sends the User-Agent" do
    stub = stub_request(:get, url)
      .with(headers: { "User-Agent" => HttpJson::USER_AGENT })
      .to_return(status: 200, body: { hello: "world" }.to_json)

    expect(HttpJson.get(url)).to eq("hello" => "world")
    expect(stub).to have_been_requested
  end

  it "passes custom request headers" do
    stub = stub_request(:get, url)
      .with(headers: { "X-Auth-Token" => "secret" })
      .to_return(status: 200, body: "{}")

    HttpJson.get(url, headers: { "X-Auth-Token" => "secret" })
    expect(stub).to have_been_requested
  end

  it "retries on 5xx then returns the eventual success" do
    stub_request(:get, url).to_return(
      { status: 500, body: "" },
      { status: 200, body: { ok: true }.to_json }
    )

    expect(HttpJson.get(url)).to eq("ok" => true)
    expect(a_request(:get, url)).to have_been_made.twice
  end

  it "retries on 429" do
    stub_request(:get, url).to_return(
      { status: 429, body: "" },
      { status: 200, body: "{}" }
    )

    HttpJson.get(url)
    expect(a_request(:get, url)).to have_been_made.twice
  end

  it "honours a numeric Retry-After header for the backoff delay" do
    stub_request(:get, url).to_return(
      { status: 429, headers: { "Retry-After" => "2" }, body: "" },
      { status: 200, body: "{}" }
    )

    HttpJson.get(url)
    expect(HttpJson).to have_received(:sleep).with(2.0)
  end

  it "raises HttpJson::Error after exhausting retries" do
    stub_request(:get, url).to_return(status: 503, body: "")

    expect { HttpJson.get(url, retries: 2) }.to raise_error(HttpJson::Error, /HTTP 503/)
    expect(a_request(:get, url)).to have_been_made.times(3) # initial + 2 retries
  end

  it "does not retry on a non-429 4xx" do
    stub_request(:get, url).to_return(status: 404, body: "")

    expect { HttpJson.get(url) }.to raise_error(HttpJson::Error, /HTTP 404/)
    expect(a_request(:get, url)).to have_been_made.once
  end

  it "follows redirects" do
    stub_request(:get, url)
      .to_return(status: 302, headers: { "Location" => "https://example.test/final.json" })
    stub_request(:get, "https://example.test/final.json")
      .to_return(status: 200, body: { final: 1 }.to_json)

    expect(HttpJson.get(url)).to eq("final" => 1)
  end
end
