class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  PER_PAGE = 20

  helper_method :current_settler?

  private

  # Offset/limit pagination for infinite scroll. Fetches one extra row to detect
  # a next page without a separate COUNT. Returns [rows, next_page, offset].
  def paginate_relation(relation)
    page = [ params[:page].to_i, 1 ].max
    offset = (page - 1) * PER_PAGE
    rows = relation.offset(offset).limit(PER_PAGE + 1).to_a
    [ rows.first(PER_PAGE), (page + 1 if rows.size > PER_PAGE), offset ]
  end

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
