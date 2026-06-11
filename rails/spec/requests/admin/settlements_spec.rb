require "rails_helper"

RSpec.describe "Admin::Settlements", type: :request do
  let(:settler) { create(:user) }

  around do |example|
    original = ENV["SETTLER_USERNAMES"]
    ENV["SETTLER_USERNAMES"] = "boss"
    example.run
    ENV["SETTLER_USERNAMES"] = original
  end

  def sign_in_settler
    create(:account, user: settler, username: "boss")
    sign_in settler
  end

  # Group match (result "home") with one home and one away voter.
  def settleable_match
    match = create(:match, :with_result)
    create(:vote, match: match, user: create(:user), pick: "home", stake: 1.0)
    create(:vote, match: match, user: create(:user), pick: "away", stake: 1.0)
    match
  end

  describe "access control" do
    it "renders the locked page (403) for a logged-in non-settler" do
      sign_in create(:user)
      get admin_settlements_path
      expect(response).to have_http_status(:forbidden)
      expect(response.body).to include("仅限结算账号")
    end

    it "is reachable by a settler" do
      sign_in_settler
      get admin_settlements_path
      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET index todo list" do
    before { sign_in_settler }

    it "renders the kicked-off, unsettled matches with score entry" do
      group = create(:match, stage: "group", kickoff_at: 2.hours.ago)
      create(:match, :knockout, kickoff_at: 3.hours.ago)
      create(:vote, match: group, user: create(:user), pick: "home", stake: 1.0)

      get admin_settlements_path

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("保存比分")  # score form
      expect(response.body).to include("晋级")      # knockout advancer label
      expect(response.body).to include("预测明细")  # vote breakdown toggle
    end
  end

  describe "POST create" do
    before { sign_in_settler }

    it "settles the selected matches and writes the ledger" do
      match = settleable_match

      expect { post admin_settlements_path, params: { match_ids: [ match.id ] } }
        .to change(LedgerEntry, :count).by(2).and change(Settlement, :count).by(1)

      expect(response).to redirect_to(admin_settlements_path)
      expect(match.reload.settled?).to be(true)
      follow_redirect!
      expect(response.body).to include("已结算 1 场")
    end

    it "skips an already-settled match and rolls back (alert)" do
      match = settleable_match
      post admin_settlements_path, params: { match_ids: [ match.id ] }
      ledger_count = LedgerEntry.count
      settlement_count = Settlement.count

      post admin_settlements_path, params: { match_ids: [ match.id ] }

      expect(LedgerEntry.count).to eq(ledger_count)       # no new ledger rows
      expect(Settlement.count).to eq(settlement_count)    # rolled-back record gone
      follow_redirect!
      expect(response.body).to include("已结算") # the "已结算" skip reason
    end
  end

  describe "POST preview" do
    before { sign_in_settler }

    it "renders the preview modal via Turbo Stream without writing anything" do
      match = settleable_match

      expect do
        post preview_admin_settlements_path,
          params: { match_ids: [ match.id ] },
          headers: { "Accept" => "text/vnd.turbo-stream.html" }
      end.not_to change(LedgerEntry, :count)

      expect(response.media_type).to eq("text/vnd.turbo-stream.html")
      expect(response.body).to include("结算预览")
      expect(response.body).to include("admin_preview")
    end
  end
end
