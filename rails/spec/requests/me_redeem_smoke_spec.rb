require "rails_helper"

# End-to-end smoke for the redeem feature as it surfaces on /me: the panel and
# its turbo targets render on the profile page, and redeeming deducts credits.
RSpec.describe "Redeem on /me", type: :request do
  let(:user) { create(:user, emoji: "🐉") }

  before do
    sign_in user
    create(:ledger_entry, user: user, delta: 3.0) # 3.0 credits available
  end

  it "renders the redeem panel and its turbo targets on the profile page" do
    get me_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include('id="redeem_panel"', 'id="me_balance"', 'id="redemption_records"')
    expect(response.body).to include("可乐", "红牛", "qty-stepper")
  end

  it "redeems from the profile balance and reflects the deduction on reload" do
    post redemptions_path,
      params: { drink: "redbull", qty: 1 },
      headers: { "Accept" => "text/vnd.turbo-stream.html" }

    expect(response).to have_http_status(:ok)
    expect(user.reload.net_balance).to eq(0.5) # 3.0 − 2.5

    get me_path
    expect(response.body).to include("红牛", "兑换记录")
  end
end
