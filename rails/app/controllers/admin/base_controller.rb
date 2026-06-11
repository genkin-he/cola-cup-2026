module Admin
  class BaseController < ApplicationController
    before_action :require_admin_access!

    private

    # Non-settlers get an in-place locked page (403) rather than a redirect, so a
    # logged-in non-settler understands why they can't see the admin.
    def require_admin_access!
      return if current_settler?

      render "admin/shared/locked", status: :forbidden
    end
  end
end
