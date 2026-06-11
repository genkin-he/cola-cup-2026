require "rails_helper"

RSpec.describe Vote do
  it { is_expected.to belong_to(:match) }
  it { is_expected.to belong_to(:user) }

  describe "validations" do
    subject { build(:vote) }

    it { is_expected.to validate_inclusion_of(:pick).in_array(%w[home draw away]) }
    it { is_expected.to validate_uniqueness_of(:user_id).scoped_to(:match_id) }
  end

  describe ".tally_for" do
    it "sums stakes per pick and counts distinct voters, excluding soft-deleted" do
      match = create(:match)
      create(:vote, match: match, user: create(:user), pick: "home", stake: 2.0)
      create(:vote, match: match, user: create(:user), pick: "home", stake: 1.0)
      create(:vote, match: match, user: create(:user), pick: "away", stake: 1.0)
      create(:vote, match: match, user: create(:user, :deleted), pick: "away", stake: 5.0)

      tally = described_class.tally_for(match)

      expect(tally.home).to be_within(1e-9).of(3.0)
      expect(tally.away).to be_within(1e-9).of(1.0)
      expect(tally.stake_total).to be_within(1e-9).of(4.0)
      expect(tally.voters).to eq(3) # deleted voter excluded
    end
  end

  describe ".detailed_for" do
    it "returns active voters oldest-edit-first" do
      match = create(:match)
      first = create(:vote, match: match, user: create(:user), updated_at: 2.hours.ago)
      second = create(:vote, match: match, user: create(:user), updated_at: 1.hour.ago)
      create(:vote, match: match, user: create(:user, :deleted))

      expect(described_class.detailed_for(match).to_a).to eq([ first, second ])
    end
  end

  describe ".tallies_by_match" do
    it "keys each match's tally by id" do
      a = create(:match)
      b = create(:match)
      create(:vote, match: a, user: create(:user), pick: "home", stake: 1.0)
      create(:vote, match: b, user: create(:user), pick: "away", stake: 2.0)

      tallies = described_class.tallies_by_match

      expect(tallies[a.id].home).to be_within(1e-9).of(1.0)
      expect(tallies[b.id].away).to be_within(1e-9).of(2.0)
    end
  end
end
