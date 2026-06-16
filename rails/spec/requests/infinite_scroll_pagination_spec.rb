require "rails_helper"

# Infinite-scroll pagination contract: the first screen renders one page (20)
# plus a sentinel pointing at page 2; a ?page=N request returns a layout-less row
# fragment, and the last page omits the data-next-url marker so the client stops.
RSpec.describe "Infinite scroll pagination", type: :request do
  include Devise::Test::IntegrationHelpers

  describe "GET /matches/:id" do
    let(:match) { create(:match) }

    before { 21.times { create(:vote, match: match, user: create(:user)) } }

    it "renders the first page with the total count and a page-2 sentinel" do
      get match_path(match)
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("同事预测 · 21 人")
      expect(response.body).to include("data-infinite-scroll-url-value")
      expect(response.body).to include(match_path(match, page: 2))
    end

    it "returns a layout-less last-page fragment with no further marker" do
      get match_path(match, page: 2)
      expect(response).to have_http_status(:ok)
      expect(response.body).not_to include("<html")
      expect(response.body).to include("vote_")
      expect(response.body).not_to include("data-next-url")
    end
  end

  describe "GET /leaderboard" do
    before { 21.times { create(:user) } }

    it "renders the first page with a page-2 sentinel" do
      get leaderboard_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("data-infinite-scroll-url-value")
      expect(response.body).to include(leaderboard_path(page: 2))
    end

    it "returns a layout-less last-page fragment with no further marker" do
      get leaderboard_path(page: 2)
      expect(response).to have_http_status(:ok)
      expect(response.body).not_to include("<html")
      expect(response.body).to include("lb_user_")
      expect(response.body).not_to include("data-next-url")
    end
  end

  describe "GET /admin/users" do
    let(:settler) { create(:user) }

    around do |example|
      original = ENV["SETTLER_USERNAMES"]
      ENV["SETTLER_USERNAMES"] = "boss"
      example.run
      ENV["SETTLER_USERNAMES"] = original
    end

    before do
      create(:account, user: settler, username: "boss")
      sign_in settler
      20.times { create(:user) } # settler + 20 = 21 total
    end

    it "renders the first page with a page-2 sentinel" do
      get admin_users_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("data-infinite-scroll-url-value")
      expect(response.body).to include("page=2")
    end

    it "returns a layout-less last-page fragment with no further marker" do
      get admin_users_path(page: 2)
      expect(response).to have_http_status(:ok)
      expect(response.body).not_to include("<html")
      expect(response.body).to include("admin_user_")
      expect(response.body).not_to include("data-next-url")
    end
  end
end
