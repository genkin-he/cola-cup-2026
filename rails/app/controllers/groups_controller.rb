class GroupsController < ApplicationController
  include MatchListData

  def show
    @group = Standings::Group.find(params[:letter])
    assign_schedule_data(@group.matches)
  end
end
