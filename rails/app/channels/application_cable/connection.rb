module ApplicationCable
  class Connection < ActionCable::Connection::Base
    # Anonymous connections are allowed (current_user may be nil) — the schedule,
    # match and leaderboard streams are public. Signed streams (the per-user
    # ledger) are protected by their stream name, not by rejecting the socket.
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      env["warden"]&.user
    end
  end
end
