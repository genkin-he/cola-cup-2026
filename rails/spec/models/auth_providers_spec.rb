require "rails_helper"

RSpec.describe AuthProviders do
  around do |example|
    original = ENV.to_hash
    example.run
    ENV.replace(original)
  end

  describe ".twitter_enabled?" do
    it "is true only when AUTH_TWITTER_ID is present" do
      ENV["AUTH_TWITTER_ID"] = "abc"
      expect(described_class.twitter_enabled?).to be(true)

      ENV.delete("AUTH_TWITTER_ID")
      expect(described_class.twitter_enabled?).to be(false)
    end
  end

  describe ".oidc_enabled?" do
    it "is true only when OIDC_ISSUER is present" do
      ENV["OIDC_ISSUER"] = "https://idp.example/realms/x"
      expect(described_class.oidc_enabled?).to be(true)

      ENV.delete("OIDC_ISSUER")
      expect(described_class.oidc_enabled?).to be(false)
    end
  end

  describe ".oidc_display_name" do
    it "defaults to 'OIDC 登录' and honors OIDC_DISPLAY_NAME" do
      ENV.delete("OIDC_DISPLAY_NAME")
      expect(described_class.oidc_display_name).to eq("OIDC 登录")

      ENV["OIDC_DISPLAY_NAME"] = "用公司账号登录"
      expect(described_class.oidc_display_name).to eq("用公司账号登录")
    end
  end

  describe ".any_enabled?" do
    it "is true when at least one provider is enabled" do
      ENV.delete("AUTH_TWITTER_ID")
      ENV.delete("OIDC_ISSUER")
      expect(described_class.any_enabled?).to be(false)

      ENV["OIDC_ISSUER"] = "https://idp.example/realms/x"
      expect(described_class.any_enabled?).to be(true)
    end
  end
end
