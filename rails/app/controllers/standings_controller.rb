class StandingsController < ApplicationController
  def third_place
    @entries = Standings::ThirdPlace.ranked
    @slots = Standings::ThirdPlace::QUALIFYING_SLOTS
  end
end
