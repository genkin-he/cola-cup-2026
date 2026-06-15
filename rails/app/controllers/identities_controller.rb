class IdentitiesController < ApplicationController
  def show
    if current_user
      # New users (no emoji yet) set up their profile first; everyone else lands
      # on the ledger.
      redirect_to(current_user.emoji.nil? ? me_settings_path : me_path)
    else
      # A leftover remember_user_token (a logout that couldn't run forget_me!, a
      # browser restart, or a stale cookie from a prior deployment on this host)
      # makes Devise's rememberable re-authenticate on every request, rewriting
      # the session and rotating its CSRF token — so the next OmniAuth POST fails
      # the request phase with InvalidAuthenticityToken. We are rendering the
      # logged-out login page, so any remember cookie here is stale by definition:
      # drop it before rendering the form, leaving the clean state a fresh
      # (incognito) session already logs in from.
      cookies.delete(:remember_user_token)

      # Never cache the login page: the OmniAuth request phase verifies the form's
      # CSRF token against the current session, so a cached or back-button page
      # would post a stale token and fail. no-store also opts out of the bfcache.
      response.headers["Cache-Control"] = "no-store"
    end
  end
end
