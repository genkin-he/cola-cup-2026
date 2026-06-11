require "rails_helper"

RSpec.describe ImportScheduleJob do
  let(:teams_url) { Openfootball::ScheduleImport::TEAMS_URL }
  let(:schedule_url) { Openfootball::ScheduleImport::SCHEDULE_URL }

  let(:teams_body) do
    [
      { name: "Brazil", flag_icon: "🇧🇷", fifa_code: "BRA", confed: "CONMEBOL" },
      { name: "Argentina", flag_icon: "🇦🇷", fifa_code: "ARG", confed: "CONMEBOL" }
    ].to_json
  end

  let(:schedule_body) do
    {
      name: "World Cup 2026",
      matches: [
        { round: "Matchday 1", date: "2026-06-11", time: "13:00 UTC-6",
          team1: "Brazil", team2: "Argentina", group: "Group A", ground: "Stadium" },
        { round: "Round of 32", num: 73, date: "2026-06-28", time: "12:00 UTC-7",
          team1: "1A", team2: "2B", ground: "Arena" }
      ]
    }.to_json
  end

  before do
    stub_request(:get, teams_url).to_return(status: 200, body: teams_body)
    stub_request(:get, schedule_url).to_return(status: 200, body: schedule_body)
  end

  it "imports teams and fixtures from the network" do
    ImportScheduleJob.perform_now

    expect(Team.count).to eq(2)
    expect(Match.count).to eq(2)

    brazil = Team.find_by(name: "Brazil")
    expect(brazil.flag).to eq("🇧🇷")
    expect(brazil.code).to eq("BRA")
    expect(brazil.aliases).to include("BRA")

    group_match = Match.find_by(external_key: "Matchday 1|2026-06-11|Brazil|Argentina")
    expect(group_match.stage).to eq("group")
    expect(group_match.home_team).to eq(brazil)
    expect(group_match.kickoff_at.utc.iso8601).to eq("2026-06-11T19:00:00Z")

    knockout = Match.find_by(external_key: "m:73")
    expect(knockout.stage).to eq("r32")
    expect(knockout.home_team_id).to be_nil
    expect(knockout.home_label).to eq("1A")
    expect(knockout.away_label).to eq("2B")
  end

  it "is idempotent across runs (no duplicate rows)" do
    ImportScheduleJob.perform_now

    expect { ImportScheduleJob.perform_now }
      .to change { Team.count }.by(0)
      .and change { Match.count }.by(0)
  end
end
