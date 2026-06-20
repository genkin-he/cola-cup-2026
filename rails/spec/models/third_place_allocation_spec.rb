require "rails_helper"

RSpec.describe ThirdPlaceAllocation do
  # Allowed third-place pool per hosting match (from the openfootball R32 labels).
  POOLS = {
    74 => %w[A B C D F], 77 => %w[C D F G H], 79 => %w[C E F H I], 80 => %w[E H I J K],
    81 => %w[B E F I J], 82 => %w[A E H I J], 85 => %w[E F G I J], 87 => %w[D E I J L]
  }.freeze

  it "covers all 495 combinations of eight groups" do
    expect(described_class::TABLE.size).to eq(495)
  end

  it "matches the official row for qualifying set A,B,C,D,F,G,H,K" do
    expect(described_class.assignment(%w[K A C B G D F H])).to eq(
      74 => "C", 77 => "F", 79 => "H", 80 => "K", 81 => "B", 82 => "A", 85 => "G", 87 => "D"
    )
  end

  it "assigns, in every row, each qualifying third to exactly one slot within its pool" do
    described_class::TABLE.each do |groups, hosted|
      expect(hosted.chars.sort.join).to eq(groups) # a permutation: 8 distinct thirds, all used
      described_class::MATCH_ORDER.each_with_index do |match_num, index|
        expect(POOLS.fetch(match_num)).to include(hosted[index]) # within the slot's allowed pool
      end
    end
  end
end
