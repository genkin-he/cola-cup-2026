class IdentitiesController < ApplicationController
  def show
    return unless current_user

    # New users (no emoji yet) set up their profile first; everyone else lands on
    # the ledger.
    redirect_to(current_user.emoji.nil? ? me_settings_path : me_path)
  end
end
