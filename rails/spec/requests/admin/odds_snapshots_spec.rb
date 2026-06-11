require "rails_helper"

RSpec.describe "Admin::OddsSnapshots", type: :request do
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
  end

  it "stores a manual snapshot for valid probabilities" do
    match = create(:match, stage: "group")

    expect do
      post admin_match_odds_snapshots_path(match), params: { p_home: 0.5, p_draw: 0.3, p_away: 0.2 }
    end.to change { match.odds_snapshots.where(source: "manual").count }.by(1)

    snapshot = match.odds_snapshots.where(source: "manual").last
    expect(snapshot.locked?).to be(false)
    expect(snapshot.d_home).to be_within(1e-9).of(2.0) # 1 / 0.5
  end

  it "rejects out-of-range probabilities with the Chinese message" do
    match = create(:match, stage: "group")

    expect do
      post admin_match_odds_snapshots_path(match), params: { p_home: 1.5, p_draw: 0.3, p_away: 0.2 }
    end.not_to change(OddsSnapshot, :count)

    follow_redirect!
    expect(response.body).to include("概率需为 0–1 之间（小数）")
  end
end
