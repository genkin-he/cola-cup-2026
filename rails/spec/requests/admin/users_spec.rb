require "rails_helper"

RSpec.describe "Admin::Users", type: :request do
  let(:settler) { create(:user) }

  around do |example|
    original = ENV["SETTLER_USERNAMES"]
    ENV["SETTLER_USERNAMES"] = "boss"
    example.run
    ENV["SETTLER_USERNAMES"] = original
  end

  def sign_in_settler
    create(:account, user: settler, username: "boss")
    sign_in settler
  end

  it "renders the locked page (403) for a non-settler" do
    sign_in create(:user)
    get admin_users_path
    expect(response).to have_http_status(:forbidden)
  end

  describe "as a settler" do
    before { sign_in_settler }

    it "soft-deletes another user" do
      target = create(:user)
      delete admin_user_path(target)
      expect(target.reload.deleted?).to be(true)
    end

    it "refuses to delete yourself" do
      delete admin_user_path(settler)
      expect(settler.reload.deleted?).to be(false)
    end

    it "restores a soft-deleted user" do
      target = create(:user, :deleted)
      patch restore_admin_user_path(target)
      expect(target.reload.deleted_at).to be_nil
    end

    it "lists all users including soft-deleted" do
      active = create(:user, nickname: "在场")
      gone = create(:user, :deleted, nickname: "已删")
      get admin_users_path
      expect(response.body).to include("在场").and include("已删")
    end
  end
end
