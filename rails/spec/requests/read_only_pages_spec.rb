require "rails_helper"

# Read-only page rendering (阶段7): anonymous + signed-in variants, key copy,
# and the auth-error cookie branches.
RSpec.describe "Read-only pages", type: :request do
  include Devise::Test::IntegrationHelpers

  describe "GET /" do
    it "renders the masthead and a match card" do
      match = create(:match)
      get root_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("按赔率", "赢可乐")
      expect(response.body).to include(match.home_team.display_name)
      expect(response.body).to include("match_card_#{match.id}")
    end
  end

  describe "GET /matches/:id" do
    it "renders the odds comparison and votes list with broadcast ids" do
      match = create(:match)
      get match_path(match)
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("赔率对比", "同事预测")
      expect(response.body).to include("odds_compare_#{match.id}", "votes_list_#{match.id}")
    end

    it "stamps an unlocked market line with its snapshot time" do
      match = create(:match)
      create(:odds_snapshot, match: match, source: "polymarket",
             taken_at: Time.utc(2026, 6, 13, 0, 0)) # 08:00 Beijing
      get match_path(match)
      expect(response.body).to include("更新于 6/13 08:00")
    end

    it "stamps a locked market line with its freeze time" do
      match = create(:match)
      create(:odds_snapshot, match: match, source: "polymarket", locked: true,
             taken_at: Time.utc(2026, 6, 13, 0, 0))
      get match_path(match)
      expect(response.body).to include("锁定于 6/13 08:00")
    end
  end

  describe "GET /leaderboard" do
    it "ranks users with hit-rate and redeemed credits" do
      user = create(:user, nickname: "阿强")
      m1 = create(:match)
      m2 = create(:match)
      create(:ledger_entry, user: user, match: m1, won: true, delta: 1.0)
      create(:ledger_entry, user: user, match: m2, won: false, delta: -1.0)
      create(:redemption, user: user, cost: 1.0)

      get leaderboard_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("镰刀榜", "阿强", "50% 命中", "已兑 1.0")
    end

    it "exposes the viewer's row for client-side 「你」 highlighting" do
      user = create(:user, nickname: "我自己")
      create(:ledger_entry, user: user)
      sign_in user
      get leaderboard_path
      # The 「你」 badge is added client-side by the highlight_me controller (so the
      # same markup is broadcast-safe); the server just exposes the row id.
      expect(response.body).to include('data-controller="highlight-me"')
      expect(response.body).to include(%(data-user-id="#{user.id}"))
    end

    it "switches to another board by ?board= and exposes the tab switcher" do
      create(:user, nickname: "肥宅甲").tap do |u|
        create(:ledger_entry, user: u, delta: 5.0, won: true)
        create(:redemption, user: u, cost: 3.0)
      end

      get leaderboard_path(board: "otaku")
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("肥宅榜") # current board title
      # switcher links to the other boards
      expect(response.body).to include("/leaderboard?board=oracle", "/leaderboard?board=jinx", "/leaderboard?board=leek")
      expect(response.body).to include("怎么算的", "只统计兑换过饮料的人") # public explainer
    end

    it "publishes the formula and headlines the computed score on the accuracy boards" do
      user = create(:user)
      create(:ledger_entry, user: user, won: true)

      get leaderboard_path(board: "oracle")
      expect(response.body).to include("怎么算的", "贝叶斯加权", "IMDB", "神域分")

      get leaderboard_path(board: "jinx")
      expect(response.body).to include("Wilson 置信区间下界", "Reddit", "毒奶分")
    end

    it "falls back to the default board for an unknown ?board=" do
      get leaderboard_path(board: "nope")
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("镰刀榜")
    end
  end

  describe "GET /about" do
    it "renders the rules and drink menu" do
      get about_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("是请客", "怎么玩", "红牛")
    end
  end

  describe "GET /identity" do
    it "shows the sign-in button when anonymous" do
      allow(AuthProviders).to receive(:twitter_enabled?).and_return(true)
      allow(AuthProviders).to receive(:any_enabled?).and_return(true)
      get identity_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("参与竞猜", "/users/auth/twitter2")
    end

    it "redirects a profiled user to the ledger" do
      sign_in create(:user, emoji: "🦊")
      get identity_path
      expect(response).to redirect_to(me_path)
    end
  end

  describe "GET /me" do
    it "redirects anonymous visitors to the identity prompt" do
      get me_path
      expect(response).to redirect_to(identity_path)
    end

    it "shows the balance breakdown and the settlement ledger when signed in" do
      user = create(:user, nickname: "老王", emoji: "🐯")
      match = create(:match, :settled)
      create(:ledger_entry, user: user, match: match, won: true, delta: 1.5, d_used: 2.0)
      create(:redemption, user: user, cost: 0.5)
      sign_in user
      get me_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("当前总赢分", "已兑换", "可用额度", "结算明细")
      expect(response.body).to include("+1.50") # 当前总赢分
      expect(response.body).to include("+1.00") # 可用额度 = 1.5 − 0.5
      expect(response.body).to include(match.home_team.display_name)
    end
  end

  describe "GET /me/settings" do
    it "renders the profile form, account, and sign-out" do
      user = create(:user, :with_account, nickname: "小美", emoji: "🦊")
      sign_in user
      get me_settings_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("我的设置", "选个头像 emoji", "退出登录")
      expect(response.body).to include('name="nickname"')
    end
  end

  describe "PATCH /me/settings" do
    it "saves nickname + emoji and redirects to the ledger" do
      user = create(:user, nickname: "旧名", emoji: "🦊")
      sign_in user
      patch me_settings_path, params: { nickname: "新名", emoji: "🐯" }
      expect(response).to redirect_to(me_path)
      expect(user.reload.nickname).to eq("新名")
      expect(user.emoji).to eq("🐯")
    end

    it "sends a first-time user (no emoji) home after setup" do
      user = create(:user, nickname: "新人", emoji: nil)
      sign_in user
      patch me_settings_path, params: { nickname: "新人", emoji: "🚀" }
      expect(response).to redirect_to(root_path)
    end
  end

  describe "GET /auth/error" do
    it "explains a suspended account" do
      cookies["x_auth_error"] = "suspended"
      get auth_error_path
      expect(response.body).to include("无法", "suspended")
    end

    it "shows the Beijing reset time when rate-limited" do
      # 2026-06-11 03:00 UTC == 2026-06-11 11:00 Beijing
      epoch = Time.utc(2026, 6, 11, 3, 0).to_i
      cookies["x_auth_error"] = "rate_limited:#{epoch}"
      get auth_error_path
      expect(response.body).to include("暂时受限", "6月11日 11:00")
    end

    it "falls back to a generic message" do
      get auth_error_path
      expect(response.body).to include("出错了")
    end
  end
end
