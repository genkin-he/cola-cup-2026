class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern


  helper_method :current_settler?

  private

  # Gate for self-service actions (vote / redeem / profile): anonymous visitors
  # are sent to the identity prompt instead of a login wall.
  def require_login!
    redirect_to identity_path, status: :see_other unless user_signed_in?
  end

  # Gate for the settlement admin: non-settlers get 403 in place.
  def require_settler!
    return redirect_to(identity_path, status: :see_other) unless user_signed_in?

    head :forbidden unless current_user.settler?
  end

  def current_settler?
    user_signed_in? && current_user.settler?
  end
end
