require "rails_helper"

RSpec.describe User, ".from_omniauth" do
  def auth_hash(uid: "777", name: "Lionel Messi", nickname: "leomessi", image: "https://pbs.x/p_normal.jpg")
    OmniAuth::AuthHash.new(
      provider: "twitter2", uid: uid,
      info: { name: name, nickname: nickname, image: image }
    )
  end

  it "creates a user and a normalized account on first login" do
    expect { User.from_omniauth(auth_hash) }
      .to change(User, :count).by(1).and change(Account, :count).by(1)

    user = User.last
    expect(user.nickname).to eq("Lionel Messi")
    expect(user.avatar_url).to eq("https://pbs.x/p_400x400.jpg") # _normal -> _400x400

    account = user.accounts.first
    expect(account.provider).to eq("twitter") # normalized from "twitter2"
    expect(account.provider_account_id).to eq("777")
    expect(account.username).to eq("leomessi")
  end

  it "truncates the display name to 16 chars and falls back to 球迷 when blank" do
    long = User.from_omniauth(auth_hash(uid: "1", name: "A very long display name"))
    expect(long.nickname).to eq("A very long disp")

    blank = User.from_omniauth(auth_hash(uid: "2", name: ""))
    expect(blank.nickname).to eq("球迷")
  end

  it "refreshes handle and avatar on re-login but never the edited nickname/emoji" do
    user = User.from_omniauth(auth_hash(uid: "9", nickname: "old_handle", image: "https://x/a_normal.png"))
    user.update!(nickname: "我的昵称", emoji: "🐉")

    expect {
      User.from_omniauth(auth_hash(uid: "9", name: "Whatever", nickname: "new_handle", image: "https://x/b_normal.png"))
    }.not_to change(User, :count)

    user.reload
    expect(user.nickname).to eq("我的昵称") # preserved
    expect(user.emoji).to eq("🐉")        # preserved
    expect(user.avatar_url).to eq("https://x/b_400x400.png") # refreshed
    expect(user.accounts.first.username).to eq("new_handle") # refreshed
  end

  it "blocks a soft-deleted user from authenticating" do
    user = User.from_omniauth(auth_hash(uid: "5"))
    expect(user.active_for_authentication?).to be(true)

    user.soft_delete!
    expect(user.active_for_authentication?).to be(false)
    expect(user.inactive_message).to eq(:deleted_account)
  end
end
