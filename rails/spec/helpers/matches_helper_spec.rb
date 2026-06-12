require "rails_helper"

RSpec.describe MatchesHelper, type: :helper do
  def tally(home:, draw:, away:)
    Vote::Tally.new(
      home: home, draw: draw, away: away,
      stake_total: home + draw + away, voters: 0
    )
  end

  describe "#preview_odds_by_pick" do
    let(:match) { build_stubbed(:match, stage: "group") } # stake 1.0, allows draw

    it "lets a new voter on an unbacked side win the existing pool" do
      # 葡萄牙 (home) has one 1-bottle vote; the viewer has not voted yet.
      odds = helper.preview_odds_by_pick(match, tally(home: 1.0, draw: 0.0, away: 0.0), nil)

      # Pick 平 (draw): pool = my 1, total = their 1 + my 1 = 2 => 2.0 => win 1 瓶.
      expect(odds["draw"]).to be_within(1e-9).of(2.0)
      # Pick 葡萄牙: I'd just join the only backed side — no losers, win nothing.
      expect(odds["home"]).to be_within(1e-9).of(1.0)
    end

    it "moves the viewer's existing stake onto the previewed side (no double count)" do
      # home=2 (includes my 1 bottle), away=1; I currently picked home.
      odds = helper.preview_odds_by_pick(match, tally(home: 2.0, draw: 0.0, away: 1.0), "home")

      # Staying on home: total 3 / home 2 = 1.5 (unchanged raw crowd odds).
      expect(odds["home"]).to be_within(1e-9).of(1.5)
      # Switching to away moves my stake (home->1, away->2); total stays 3 =>
      # 3/2 = 1.5, not the misleading raw 3/1 = 3 that ignores the move.
      expect(odds["away"]).to be_within(1e-9).of(1.5)
    end

    it "omits draw for knockout stages" do
      ko = build_stubbed(:match, :knockout)
      odds = helper.preview_odds_by_pick(ko, tally(home: 2.0, draw: 0.0, away: 0.0), nil)

      expect(odds.keys).to contain_exactly("home", "away")
    end
  end

  describe "#pick_label_font_px" do
    it "keeps short labels at the max size" do
      expect(helper.pick_label_font_px("乌拉圭")).to eq(20)
      expect(helper.pick_label_font_px("平局")).to eq(20)
    end

    it "shrinks long names so they stay on one line" do
      expect(helper.pick_label_font_px("沙特阿拉伯")).to be < 20    # 5 chars
      expect(helper.pick_label_font_px("乌兹别克斯坦")).to be < 16  # 6 chars
    end

    it "never shrinks past the minimum size" do
      expect(helper.pick_label_font_px("波斯尼亚和黑塞哥维那")).to eq(11) # 10 chars
    end
  end
end
