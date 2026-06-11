require "rails_helper"

RSpec.describe Redemption do
  let(:user) { create(:user) }

  # Give the user a settled balance via the ledger (net_balance = Σdelta − Σcost).
  def credit(user, amount)
    create(:ledger_entry, user: user, delta: amount)
  end

  describe ".redeem!" do
    it "allows redeeming when the balance exactly covers the cost (EPSILON)" do
      credit(user, 1.5) # 各种茶 costs exactly 1.5

      expect { described_class.redeem!(user: user, drink_key: "icetea", qty: 1) }
        .to change(user.redemptions, :count).by(1)

      expect(user.net_balance).to be_within(1e-9).of(0.0)
      redemption = user.redemptions.last
      expect(redemption.cost).to eq(1.5)
      expect(redemption.unit_cost).to eq(1.5)
    end

    it "rejects redemption when the balance is a hair short (Chinese message)" do
      credit(user, 1.0)

      expect { described_class.redeem!(user: user, drink_key: "icetea", qty: 1) }
        .to raise_error(Redemption::RedeemError, "可用额度不足（需 1.5，余 1.0）")
      expect(user.redemptions.count).to eq(0)
    end

    it "re-reads the balance per redemption so it cannot be overspent" do
      credit(user, 2.0)

      described_class.redeem!(user: user, drink_key: "cola", qty: 1) # 2.0 -> 1.0
      described_class.redeem!(user: user, drink_key: "cola", qty: 1) # 1.0 -> 0.0

      expect(user.net_balance).to be_within(1e-9).of(0.0)
      expect { described_class.redeem!(user: user, drink_key: "cola", qty: 1) }
        .to raise_error(Redemption::RedeemError, /可用额度不足/)
      expect(user.redemptions.count).to eq(2)
    end

    it "charges qty × unit cost" do
      credit(user, 10.0)

      described_class.redeem!(user: user, drink_key: "redbull", qty: 3) # 2.5 × 3
      redemption = user.redemptions.last
      expect(redemption.qty).to eq(3)
      expect(redemption.cost).to eq(7.5)
    end

    it "rejects an unknown drink" do
      expect { described_class.redeem!(user: user, drink_key: "water", qty: 1) }
        .to raise_error(Redemption::RedeemError, "未知饮料")
    end

    it "rejects a non-positive quantity" do
      credit(user, 10.0)
      expect { described_class.redeem!(user: user, drink_key: "cola", qty: 0) }
        .to raise_error(Redemption::RedeemError, "兑换数量需为正整数")
    end
  end
end
