class TeamsController < ApplicationController
  include MatchListData

  def show
    @team = Team.find(params[:id])
    matches = Match.where(home_team_id: @team.id).or(Match.where(away_team_id: @team.id))
      .chronological.includes(:home_team, :away_team).to_a
    assign_schedule_data(matches)
  end
end
