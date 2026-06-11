require "rails_helper"

RSpec.describe Drink do
  it "lists the four drinks with their per-bottle credit cost" do
    expect(described_class::ALL.map { |d| [ d.key, d.cost ] }).to eq(
      [ [ "cola", 1.0 ], [ "icetea", 1.5 ], [ "alien", 1.5 ], [ "redbull", 2.5 ] ]
    )
  end

  describe ".find" do
    it "looks a drink up by key" do
      expect(described_class.find("redbull").name).to eq("红牛")
    end

    it "is nil for an unknown key" do
      expect(described_class.find("water")).to be_nil
    end
  end
end
