module Admin
  class UsersController < BaseController
    def index
      @users = User.includes(:accounts).order(:created_at)
    end

    # Soft delete (reversible). Operating on yourself is not allowed.
    def destroy
      user = User.find(params[:id])
      user.soft_delete! unless user == current_user
      redirect_to admin_users_path, status: :see_other
    end

    def restore
      User.find(params[:id]).restore!
      redirect_to admin_users_path, status: :see_other
    end
  end
end
