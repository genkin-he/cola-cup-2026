require "rails_helper"

RSpec.describe "Admin::Scores", type: :request do
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

  it "records a derived result on an unsettled match" do
    match = create(:match, stage: "group")
    patch admin_match_score_path(match), params: { home_score: 2, away_score: 1 }

    match.reload
    expect(match.result).to eq("home")
    expect(match.home_score).to eq(2)
    expect(match.settled?).to be(false)
  end

  it "only fixes the display score on a settled match" do
    match = create(:match, :settled) # result "home", 2-1

    patch admin_match_score_path(match), params: { home_score: 5, away_score: 0 }

    match.reload
    expect(match.home_score).to eq(5)
    expect(match.result).to eq("home") # unchanged
    expect(match.settled?).to be(true)
  end

  it "rejects a level knockout without an advancer (Chinese alert)" do
    match = create(:match, :knockout)

    patch admin_match_score_path(match), params: { home_score: 1, away_score: 1 }

    expect(match.reload.result).to be_nil
    follow_redirect!
    expect(response.body).to include("淘汰赛比分相同，请选择晋级方")
  end

  it "records the chosen advancer on a knockout tie" do
    match = create(:match, :knockout)

    patch admin_match_score_path(match), params: { home_score: 1, away_score: 1, result: "home" }

    expect(match.reload.result).to eq("home")
  end
end
