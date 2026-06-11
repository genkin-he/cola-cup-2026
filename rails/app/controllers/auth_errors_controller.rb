class AuthErrorsController < ApplicationController
  # The OmniAuth on_failure handler (config/initializers/devise.rb) writes the
  # x_auth_error cookie; decode it into a reason for the three-way page.
  def show
    @reason = decode_auth_error(cookies["x_auth_error"])
  end

  private

  def decode_auth_error(value)
    return nil if value.blank?
    return { kind: :suspended } if value == "suspended"

    if value.start_with?("rate_limited:")
      epoch = value.delete_prefix("rate_limited:").to_i
      return { kind: :rate_limited, reset_epoch: epoch } if epoch.positive?
    end
    nil
  end
end
