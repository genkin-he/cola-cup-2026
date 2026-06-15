require "rails_helper"

# Regression: Devise resolves the user for sign_out (and its verify_signed_out_user
# guard) with run_callbacks: false, so it only sees a user present in the *session*.
# Someone kept signed in purely by the 90-day remember cookie (session cookie gone
# after a browser restart) is invisible to it — the before_logout hook never fires
# and forget_me! never runs, leaving a still-valid remember_user_token behind. That
# stale cookie then re-authenticates the login page and churns the CSRF token,
# breaking the next OmniAuth login with InvalidAuthenticityToken. Users::SessionsController
# forces the forget so logout always invalidates the remember cookie.
RSpec.describe "Logout invalidates the remember cookie", type: :request do
  # A real, app-signed remember cookie — the exact bytes Devise would set — built
  # without a session, so the request is authenticated by rememberable alone.
  def signed_remember_cookie(user)
    jar = ActionDispatch::TestRequest.create.cookie_jar
    jar.signed[:remember_user_token] = User.serialize_into_cookie(user)
    jar[:remember_user_token]
  end

  it "clears the DB remember token and the cookie when only the remember cookie keeps the user in" do
    user = User.create!(nickname: "tester", encrypted_password: "")
    user.remember_me!
    expect(user.reload.remember_created_at).to be_present

    cookies[:remember_user_token] = signed_remember_cookie(user)

    delete destroy_user_session_path

    expect(user.reload.remember_created_at).to be_nil
    expect(cookies[:remember_user_token]).to be_blank
  end
end
