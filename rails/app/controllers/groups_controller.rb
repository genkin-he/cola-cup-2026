class GroupsController < ApplicationController
  include MatchListData

  def index
    @groups = Standings::Group.tables.map do |letter, rows|
      Standings::Group.new(name: "Group #{letter}", letter: letter, rows: rows)
    end
  end

  def show
    @group = Standings::Group.find(params[:letter])
    assign_schedule_data(@group.matches)
  end
end
