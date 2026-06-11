require "rails_helper"

# Integration coverage for the Twitter callback. The devise_for block in
# routes.rb is enabled by team-lead at the end of 阶段4; until then the named
# route is absent and these examples are pending (they activate automatically
# once the routes land).
RSpec.describe "Users::OmniauthCallbacks", type: :request do
  before do
    unless Rails.application.routes.url_helpers.respond_to?(:user_twitter2_omniauth_callback_path)
      skip "devise_for routes not enabled yet (team-lead to uncomment in routes.rb)"
    end

    OmniAuth.config.test_mode = true
    OmniAuth.config.mock_auth[:twitter2] = OmniAuth::AuthHash.new(
      provider: "twitter2", uid: "4242",
      info: { name: "Test Fan", nickname: "testfan", image: "https://x/a_normal.jpg" }
    )
    Rails.application.env_config["omniauth.auth"] = OmniAuth.config.mock_auth[:twitter2]
  end

  after do
    OmniAuth.config.test_mode = false
    OmniAuth.config.mock_auth[:twitter2] = nil
    Rails.application.env_config.delete("omniauth.auth")
  end

  it "creates the user on first login and redirects to profile setup (no emoji yet)" do
    expect { post user_twitter2_omniauth_callback_path }.to change(User, :count).by(1)
    expect(response).to redirect_to(me_settings_path)
  end

  it "sends a returning user (emoji set) to their dashboard" do
    User.from_omniauth(OmniAuth.config.mock_auth[:twitter2]).update!(emoji: "🐉")

    post user_twitter2_omniauth_callback_path
    expect(response).to redirect_to(me_path)
  end
end
