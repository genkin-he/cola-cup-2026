require "rails_helper"

RSpec.describe Settlement do
  let(:settler) { create(:user) }

  # A group match (result "home") with three voters: two on home, one on away.
  def match_with_voters
    match = create(:match, :with_result) # result "home", group stage
    home1 = create(:user)
    home2 = create(:user)
    away1 = create(:user)
    create(:vote, match: match, user: home1, pick: "home", stake: 1.0)
    create(:vote, match: match, user: home2, pick: "home", stake: 1.0)
    create(:vote, match: match, user: away1, pick: "away", stake: 1.0)
    [ match, home1, home2, away1 ]
  end

  def net_for(preview, user)
    preview.users.find { |u| u.user_id == user.id }&.net
  end

  describe ".preview" do
    it "computes each person's net without writing anything" do
      match, home1, home2, away1 = match_with_voters

      preview = described_class.preview([ match.id ])

      expect(preview.ok?).to be(true)
      expect(net_for(preview, home1)).to be_within(1e-9).of(0.5)
      expect(net_for(preview, home2)).to be_within(1e-9).of(0.5)
      expect(net_for(preview, away1)).to be_within(1e-9).of(-1.0)
      expect(preview.matches.first.voters).to eq(3)
      expect(LedgerEntry.count).to eq(0)
      expect(Settlement.count).to eq(0)
    end

    it "is sorted by net descending" do
      match, = match_with_voters
      preview = described_class.preview([ match.id ])
      nets = preview.users.map(&:net)
      expect(nets).to eq(nets.sort.reverse)
    end
  end

  describe "IncludedMap three-state semantics" do
    it "defaults a missing key to every voter" do
      match, home1, home2, away1 = match_with_voters
      preview = described_class.preview([ match.id ], included: {})
      expect(preview.users.map(&:user_id)).to contain_exactly(home1.id, home2.id, away1.id)
    end

    it "intersects an explicit array with the real voters" do
      match, home1, _home2, away1 = match_with_voters
      preview = described_class.preview([ match.id ], included: { match.id.to_s => [ home1.id, away1.id ] })

      # Only the two opted-in voters settle: home1 +1, away1 -1; home2 absent.
      expect(preview.users.map(&:user_id)).to contain_exactly(home1.id, away1.id)
      expect(net_for(preview, home1)).to be_within(1e-9).of(1.0)
      expect(net_for(preview, away1)).to be_within(1e-9).of(-1.0)
    end

    it "treats an explicit empty array as 'skip this match'" do
      match, = match_with_voters
      preview = described_class.preview([ match.id ], included: { match.id.to_s => [] })

      expect(preview.ok?).to be(false)
      expect(preview.skipped).to eq([ { match_id: match.id, reason: "未选择参与者" } ])
    end
  end

  describe ".commit!" do
    it "writes ledger entries matching the preview and links the settlement" do
      match, home1, home2, away1 = match_with_voters
      preview = described_class.preview([ match.id ])

      result = described_class.commit!([ match.id ], settler: settler)

      expect(result.settled).to eq(1)
      expect(match.reload.settled?).to be(true)
      expect(match.settlement).to eq(result.settlement)
      expect(result.settlement.match_count).to eq(1)
      expect(result.settlement.created_by).to eq(settler)

      [ home1, home2, away1 ].each do |user|
        ledger = LedgerEntry.find_by(match: match, user: user)
        expect(ledger.delta).to be_within(1e-9).of(net_for(preview, user))
      end
    end

    it "is idempotent: re-settling a settled match is skipped (已结算) and rolls back" do
      match, = match_with_voters
      described_class.commit!([ match.id ], settler: settler)

      expect { described_class.commit!([ match.id ], settler: settler) }
        .to raise_error(Settlement::CommitError, "已结算")

      expect(LedgerEntry.count).to eq(3)   # unchanged
      expect(Settlement.count).to eq(1)    # the rolled-back record did not persist
    end

    it "commits only the opted-in voters when an explicit array is given" do
      match, home1, home2, away1 = match_with_voters

      described_class.commit!([ match.id ], settler: settler,
        included: { match.id.to_s => [ home1.id, away1.id ] })

      expect(LedgerEntry.where(match: match).pluck(:user_id)).to contain_exactly(home1.id, away1.id)
      expect(LedgerEntry.find_by(match: match, user: home1).delta).to be_within(1e-9).of(1.0)
      expect(LedgerEntry.exists?(match: match, user: home2)).to be(false)
    end

    it "rolls back entirely when every match is skipped" do
      no_result = create(:match) # result blank -> 尚未录入赛果

      expect { described_class.commit!([ no_result.id ], settler: settler) }
        .to raise_error(Settlement::CommitError, "尚未录入赛果")

      expect(Settlement.count).to eq(0)
      expect(LedgerEntry.count).to eq(0)
      expect(no_result.reload.settled?).to be(false)
    end

    it "excludes soft-deleted voters from the ledger" do
      match, home1, home2, away1 = match_with_voters
      home2.soft_delete!

      described_class.commit!([ match.id ], settler: settler)

      expect(LedgerEntry.where(match: match).pluck(:user_id)).to contain_exactly(home1.id, away1.id)
    end
  end

  describe "#ensure_locked_odds!" do
    it "freezes the crowd-vote odds once and is idempotent" do
      match, = match_with_voters

      locked = match.ensure_locked_odds!
      expect(locked).to be_present
      expect(locked.source).to eq("vote")
      expect(locked.locked?).to be(true)

      match.ensure_locked_odds! # second pass
      expect(match.odds_snapshots.where(locked: true, source: "vote").count).to eq(1)
    end

    it "freezes the latest market line once when one exists" do
      match, = match_with_voters
      create(:odds_snapshot, match: match, source: "polymarket", locked: false,
        p_home: 0.6, p_away: 0.4, d_home: 1.67, d_away: 2.5, taken_at: Time.current)

      2.times { match.ensure_locked_odds! }

      expect(match.odds_snapshots.where(locked: true, source: "polymarket").count).to eq(1)
    end
  end
end
